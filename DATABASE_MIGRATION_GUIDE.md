# Complete Database Migration Guide

This guide provides the complete database schema and migration order for your maintenance planning system. Follow the steps below to ensure all database components are properly set up.

## Migration Order

**IMPORTANT**: Run the migrations in this exact order to avoid dependency issues:

1. `001_create_chat_schema.sql` - Creates basic tables (chat_messages, anomalies, maintenance_windows)
2. `002_create_logs_schema.sql` - Creates logs table and logging functions
3. `003_create_anomalies_table.sql` - Creates the production anomalies table
4. `005_create_action_plans_simple.sql` - Creates action plans and action items tables
5. `006_create_maintenance_windows.sql` - Creates planning tables and configurations
6. `007_create_planning_metrics.sql` - Creates metrics and analytics tables (NEW)

## Migration Commands

To apply these migrations to your Supabase database, run:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manual execution via SQL editor in Supabase Dashboard
# Copy and paste each migration file content in order
```

## Complete Schema Overview

### Core Tables

#### 1. Users & Authentication
- Uses Supabase Auth (`auth.users`)
- Extended with user metadata for roles

#### 2. Anomalies Table
```sql
public.anomalies (
    id UUID PRIMARY KEY,
    equipement_id TEXT NOT NULL,
    description TEXT,
    service TEXT,
    system_id TEXT,
    status TEXT DEFAULT 'nouvelle',
    source_origine TEXT,
    ai_fiabilite_integrite_score INTEGER,
    ai_disponibilite_score INTEGER,
    ai_process_safety_score INTEGER,
    ai_criticality_level INTEGER,
    human_fiabilite_integrite_score INTEGER,
    human_disponibilite_score INTEGER,
    human_process_safety_score INTEGER,
    human_criticality_level INTEGER,
    final_fiabilite_integrite_score INTEGER GENERATED,
    final_disponibilite_score INTEGER GENERATED,
    final_process_safety_score INTEGER GENERATED,
    final_criticality_level INTEGER GENERATED,
    estimated_hours INTEGER,
    priority INTEGER,
    maintenance_window_id UUID REFERENCES maintenance_windows(id),
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 3. Maintenance Windows Table
```sql
public.maintenance_windows (
    id UUID PRIMARY KEY,
    type TEXT CHECK (type IN ('force', 'minor', 'major')),
    duration_days INTEGER NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'planned',
    auto_created BOOLEAN DEFAULT FALSE,
    source_anomaly_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 4. Action Plans & Items
```sql
public.action_plans (
    id UUID PRIMARY KEY,
    anomaly_id UUID NOT NULL,
    needs_outage BOOLEAN DEFAULT FALSE,
    outage_type TEXT,
    outage_duration INTEGER,
    planned_date TIMESTAMPTZ,
    estimated_cost DECIMAL(10,2),
    priority INTEGER DEFAULT 3,
    comments TEXT,
    status TEXT DEFAULT 'draft',
    completion_percentage INTEGER DEFAULT 0,
    total_duration_hours INTEGER DEFAULT 0,
    total_duration_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)

public.action_items (
    id UUID PRIMARY KEY,
    action_plan_id UUID REFERENCES action_plans(id),
    action TEXT NOT NULL,
    responsable TEXT NOT NULL,
    pdrs_disponible TEXT,
    ressources_internes TEXT,
    ressources_externes TEXT,
    statut TEXT DEFAULT 'planifie',
    duree_heures INTEGER DEFAULT 0,
    duree_jours INTEGER DEFAULT 0,
    date_debut TIMESTAMPTZ,
    date_fin TIMESTAMPTZ,
    progression INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 5. Logs & Audit Trail
```sql
public.logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    username TEXT,
    action TEXT NOT NULL,
    category TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 6. Planning & Analytics
```sql
public.planning_sessions (
    id UUID PRIMARY KEY,
    session_type TEXT CHECK (session_type IN ('auto', 'manual', 'optimization')),
    total_anomalies INTEGER DEFAULT 0,
    scheduled_anomalies INTEGER DEFAULT 0,
    new_windows_created INTEGER DEFAULT 0,
    optimization_score DECIMAL(5,2),
    session_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'running'
)

public.planning_configurations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    config_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

#### 7. Chat Messages
```sql
public.chat_messages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Missing Migration: Planning Metrics

You need to create migration `007_create_planning_metrics.sql`:

```sql
-- Planning metrics and analytics tables
CREATE TABLE IF NOT EXISTS public.planning_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('efficiency', 'utilization', 'completion_rate', 'scheduling_accuracy')),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    measurement_date TIMESTAMPTZ DEFAULT NOW(),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    window_id UUID REFERENCES maintenance_windows(id),
    session_id UUID REFERENCES planning_sessions(id),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Window utilization tracking
CREATE TABLE IF NOT EXISTS public.window_utilization (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    window_id UUID NOT NULL REFERENCES maintenance_windows(id),
    total_capacity_hours INTEGER NOT NULL,
    scheduled_hours INTEGER DEFAULT 0,
    utilization_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_capacity_hours > 0 
            THEN (scheduled_hours::decimal / total_capacity_hours::decimal) * 100 
            ELSE 0 
        END
    ) STORED,
    anomaly_count INTEGER DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_planning_metrics_type ON public.planning_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_planning_metrics_date ON public.planning_metrics(measurement_date);
CREATE INDEX IF NOT EXISTS idx_window_utilization_window_id ON public.window_utilization(window_id);

-- Enable RLS
ALTER TABLE public.planning_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.window_utilization ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.planning_metrics
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.planning_metrics
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.window_utilization
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.window_utilization
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON public.window_utilization
    FOR UPDATE USING (true);
```

## Functions and Triggers

### Key Database Functions

1. **update_updated_at_column()** - Automatically updates timestamps
2. **get_log_statistics()** - Retrieves log analytics
3. **cleanup_old_logs()** - Maintains log table size
4. **update_maintenance_windows_updated_at()** - Updates maintenance window timestamps

### Key Triggers

1. **update_anomalies_updated_at** - Anomaly timestamp updates
2. **update_maintenance_windows_updated_at** - Window timestamp updates
3. **update_action_plans_updated_at** - Action plan timestamp updates
4. **update_action_items_updated_at** - Action item timestamp updates

## Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow authenticated users to read/write data
- Secure user-specific data (like chat messages)
- Enable system operations for logging and metrics

## Indexes for Performance

Key indexes created for:
- Date-based queries (created_at, start_date, etc.)
- Status filtering (status, criticality_level)
- Foreign key relationships (anomaly_id, window_id, etc.)
- Search operations (equipment_id, service)

## Data Validation

Tables include comprehensive CHECK constraints for:
- Status values (predefined enums)
- Score ranges (1-5 for scores, 1-15 for criticality)
- Date validation (end_date > start_date)
- Percentage values (0-100 for completion rates)

## Post-Migration Steps

After running all migrations:

1. **Verify Tables**: Check that all tables exist with correct schema
2. **Test RLS**: Ensure Row Level Security policies work correctly
3. **Validate Data**: Insert test data to verify constraints
4. **Check Indexes**: Confirm all indexes are created
5. **Test Functions**: Run database functions to ensure they work
6. **Configure Planning**: Update planning_configurations if needed

## Connection Verification

Test your database connection with:

```javascript
import { supabase } from './src/lib/supabase.ts'

// Test basic connection
const { data, error } = await supabase
  .from('anomalies')
  .select('count')
  .single()

console.log('Database connection:', error ? 'Failed' : 'Success')
```

## Troubleshooting

### Common Issues:

1. **Migration Order**: Ensure migrations run in correct order
2. **Foreign Key Constraints**: Create referenced tables first
3. **RLS Policies**: Verify policies allow necessary operations
4. **Function Dependencies**: Check that required functions exist

### Reset Database (if needed):

```sql
-- WARNING: This will delete all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then re-run all migrations
```

## Schema Validation Script

Create this script to validate your schema:

```sql
-- Check all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'anomalies', 'maintenance_windows', 'action_plans', 
    'action_items', 'logs', 'chat_messages', 
    'planning_sessions', 'planning_configurations',
    'planning_metrics', 'window_utilization'
);

-- Check foreign key constraints
SELECT tc.constraint_name, tc.table_name, kcu.column_name, 
       ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public';
```

This migration guide ensures your database is fully prepared for the new planning system with all required tables, constraints, indexes, and security policies.
