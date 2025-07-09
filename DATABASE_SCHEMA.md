# Database Schema for Smart Planning System

## Overview
This document describes the complete database schema required for the new planning system that handles treated anomalies with intelligent scheduling.

## Tables Structure

### 1. anomalies (existing - updates needed)
```sql
-- Update existing anomalies table to add maintenance window reference
ALTER TABLE public.anomalies 
ADD COLUMN IF NOT EXISTS maintenance_window_id UUID REFERENCES public.maintenance_windows(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_anomalies_maintenance_window_id ON public.anomalies(maintenance_window_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status);
```

### 2. maintenance_windows (new table)
```sql
CREATE TABLE public.maintenance_windows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('force', 'minor', 'major')),
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    auto_created BOOLEAN DEFAULT FALSE,
    source_anomaly_id UUID REFERENCES public.anomalies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT maintenance_windows_dates_valid CHECK (end_date > start_date)
);
```

### 3. action_plans (existing - verified structure)
```sql
-- Already exists with correct structure
-- Contains: id, anomaly_id, needs_outage, outage_type, etc.
```

### 4. planning_sessions (new table)
```sql
CREATE TABLE public.planning_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_type TEXT NOT NULL CHECK (session_type IN ('auto', 'manual', 'optimization')),
    total_anomalies INTEGER DEFAULT 0,
    scheduled_anomalies INTEGER DEFAULT 0,
    new_windows_created INTEGER DEFAULT 0,
    optimization_score DECIMAL(5,2),
    session_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
    user_id UUID -- Optional: track who initiated the session
);
```

### 5. planning_configurations (new table)
```sql
CREATE TABLE public.planning_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. planning_metrics (new table - for analytics)
```sql
CREATE TABLE public.planning_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    total_treated_anomalies INTEGER DEFAULT 0,
    auto_scheduled_anomalies INTEGER DEFAULT 0,
    manual_scheduled_anomalies INTEGER DEFAULT 0,
    unscheduled_anomalies INTEGER DEFAULT 0,
    windows_created INTEGER DEFAULT 0,
    average_scheduling_time_seconds INTEGER DEFAULT 0,
    average_compatibility_score DECIMAL(5,2),
    window_utilization_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(metric_date)
);
```

## Indexes for Performance

```sql
-- Maintenance Windows indexes
CREATE INDEX idx_maintenance_windows_start_date ON public.maintenance_windows(start_date);
CREATE INDEX idx_maintenance_windows_status ON public.maintenance_windows(status);
CREATE INDEX idx_maintenance_windows_type ON public.maintenance_windows(type);
CREATE INDEX idx_maintenance_windows_source_anomaly ON public.maintenance_windows(source_anomaly_id);

-- Planning Sessions indexes
CREATE INDEX idx_planning_sessions_type ON public.planning_sessions(session_type);
CREATE INDEX idx_planning_sessions_created_at ON public.planning_sessions(created_at);
CREATE INDEX idx_planning_sessions_status ON public.planning_sessions(status);

-- Planning Configurations indexes
CREATE INDEX idx_planning_configurations_active ON public.planning_configurations(is_active);

-- Planning Metrics indexes
CREATE INDEX idx_planning_metrics_date ON public.planning_metrics(metric_date);

-- Anomalies additional indexes for planning
CREATE INDEX idx_anomalies_status_maintenance ON public.anomalies(status, maintenance_window_id);
CREATE INDEX idx_anomalies_criticality_status ON public.anomalies(final_criticality_level, status);
```

## Triggers

```sql
-- Update timestamps trigger for maintenance_windows
CREATE OR REPLACE FUNCTION update_maintenance_windows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_maintenance_windows_updated_at
    BEFORE UPDATE ON public.maintenance_windows
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_windows_updated_at();

-- Update timestamps trigger for planning_configurations
CREATE OR REPLACE FUNCTION update_planning_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_planning_configurations_updated_at
    BEFORE UPDATE ON public.planning_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_planning_configurations_updated_at();
```

## Functions for Planning Algorithm

```sql
-- Function to calculate window utilization
CREATE OR REPLACE FUNCTION calculate_window_utilization(window_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_required_days INTEGER;
    window_duration INTEGER;
    utilization DECIMAL(5,2);
BEGIN
    -- Get window duration
    SELECT duration_days INTO window_duration
    FROM maintenance_windows
    WHERE id = window_id;
    
    IF window_duration IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate total required days from assigned anomalies
    SELECT COALESCE(SUM(
        CASE 
            WHEN ap.total_duration_days > 0 THEN ap.total_duration_days
            ELSE CEIL(COALESCE(a.estimated_hours, 8)::DECIMAL / 8)
        END
    ), 0) INTO total_required_days
    FROM anomalies a
    LEFT JOIN action_plans ap ON a.id = ap.anomaly_id
    WHERE a.maintenance_window_id = window_id;
    
    -- Calculate utilization percentage
    utilization := (total_required_days::DECIMAL / window_duration::DECIMAL) * 100;
    
    RETURN ROUND(utilization, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get compatible windows for an anomaly
CREATE OR REPLACE FUNCTION get_compatible_windows(anomaly_id UUID)
RETURNS TABLE(
    window_id UUID,
    compatibility_score INTEGER,
    window_type TEXT,
    start_date TIMESTAMPTZ,
    current_utilization DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mw.id,
        CASE 
            -- Compatibility scoring based on criticality and window type
            WHEN a.final_criticality_level >= 12 AND mw.type = 'force' THEN 100
            WHEN a.final_criticality_level >= 8 AND mw.type IN ('force', 'major') THEN 85
            WHEN a.final_criticality_level >= 4 AND mw.type IN ('major', 'minor') THEN 70
            WHEN a.final_criticality_level < 4 AND mw.type = 'minor' THEN 90
            ELSE 50
        END as compatibility_score,
        mw.type,
        mw.start_date,
        calculate_window_utilization(mw.id) as current_utilization
    FROM maintenance_windows mw
    CROSS JOIN anomalies a
    WHERE a.id = anomaly_id
        AND mw.status = 'planned'
        AND mw.start_date > NOW()
        AND calculate_window_utilization(mw.id) < 95 -- Don't suggest overloaded windows
    ORDER BY compatibility_score DESC, current_utilization ASC;
END;
$$ LANGUAGE plpgsql;
```

## RLS Policies

```sql
-- Enable RLS
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planning_metrics ENABLE ROW LEVEL SECURITY;

-- Policies for maintenance_windows
CREATE POLICY "Enable read access for all users" ON public.maintenance_windows
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.maintenance_windows
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.maintenance_windows
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON public.maintenance_windows
    FOR DELETE USING (true);

-- Similar policies for other tables...
CREATE POLICY "Enable read access for all users" ON public.planning_sessions
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.planning_configurations
    FOR SELECT USING (true);

CREATE POLICY "Enable update for authenticated users" ON public.planning_configurations
    FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON public.planning_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_metrics
    FOR INSERT WITH CHECK (true);
```

## Default Data

```sql
-- Insert default planning configuration
INSERT INTO public.planning_configurations (name, config_data, is_active) 
VALUES (
    'default_planning_config',
    '{
        "auto_schedule_enabled": true,
        "auto_schedule_delay_ms": 2000,
        "compatibility_threshold": 60,
        "window_utilization_target": 85,
        "criticality_weights": {
            "critical": 100,
            "high": 75,
            "medium": 50,
            "low": 25
        },
        "window_type_preferences": {
            "force": {
                "max_duration_days": 3,
                "preferred_for_criticality": ["critical"],
                "scheduling_urgency": "immediate"
            },
            "major": {
                "max_duration_days": 14,
                "preferred_for_criticality": ["high", "medium"],
                "scheduling_urgency": "weekend"
            },
            "minor": {
                "max_duration_days": 7,
                "preferred_for_criticality": ["medium", "low"],
                "scheduling_urgency": "flexible"
            }
        }
    }'::jsonb,
    true
) ON CONFLICT (name) DO UPDATE SET 
    config_data = EXCLUDED.config_data,
    updated_at = NOW();
```

## Migration Order

1. Run the maintenance_windows table creation
2. Add foreign key to anomalies table
3. Create planning_sessions table
4. Create planning_configurations table
5. Create planning_metrics table
6. Create all indexes
7. Create triggers and functions
8. Set up RLS policies
9. Insert default configuration data

This schema supports:
- ✅ Automatic scheduling of treated anomalies
- ✅ Window management with capacity tracking
- ✅ Planning session tracking and analytics
- ✅ Configurable algorithm parameters
- ✅ Performance metrics collection
- ✅ Compatibility scoring system
- ✅ Multiple window types (force, major, minor)
- ✅ Utilization optimization
