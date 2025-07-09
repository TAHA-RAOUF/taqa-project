-- Create anomalies table with actual schema
CREATE TABLE IF NOT EXISTS public.anomalies (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    num_equipement TEXT NOT NULL,
    description TEXT,
    service TEXT,
    responsable TEXT,
    status TEXT DEFAULT 'nouvelle'::text CHECK (status IN ('nouvelle', 'en_cours', 'traite', 'cloture')),
    source_origine TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- AI scores (1-5 scale)
    ai_fiabilite_integrite_score INTEGER CHECK (ai_fiabilite_integrite_score >= 1 AND ai_fiabilite_integrite_score <= 5),
    ai_disponibilite_score INTEGER CHECK (ai_disponibilite_score >= 1 AND ai_disponibilite_score <= 5),
    ai_process_safety_score INTEGER CHECK (ai_process_safety_score >= 1 AND ai_process_safety_score <= 5),
    ai_criticality_level INTEGER CHECK (ai_criticality_level >= 1 AND ai_criticality_level <= 15),
    
    -- Human overrides (1-5 scale)
    human_fiabilite_integrite_score INTEGER CHECK (human_fiabilite_integrite_score >= 1 AND human_fiabilite_integrite_score <= 5),
    human_disponibilite_score INTEGER CHECK (human_disponibilite_score >= 1 AND human_disponibilite_score <= 5),
    human_process_safety_score INTEGER CHECK (human_process_safety_score >= 1 AND human_process_safety_score <= 5),
    human_criticality_level INTEGER CHECK (human_criticality_level >= 1 AND human_criticality_level <= 15),
    
    -- Final scores (generated columns)
    final_fiabilite_integrite_score INTEGER GENERATED ALWAYS AS (
        COALESCE(human_fiabilite_integrite_score, ai_fiabilite_integrite_score)
    ) STORED,
    final_disponibilite_score INTEGER GENERATED ALWAYS AS (
        COALESCE(human_disponibilite_score, ai_disponibilite_score)
    ) STORED,
    final_process_safety_score INTEGER GENERATED ALWAYS AS (
        COALESCE(human_process_safety_score, ai_process_safety_score)
    ) STORED,
    final_criticality_level INTEGER GENERATED ALWAYS AS (
        COALESCE(human_criticality_level, ai_criticality_level)
    ) STORED,
    
    -- Optional fields
    estimated_hours INTEGER,
    priority INTEGER,
    maintenance_window_id UUID,
    import_batch_id UUID
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_anomalies_status ON public.anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_service ON public.anomalies(service);
CREATE INDEX IF NOT EXISTS idx_anomalies_criticality ON public.anomalies(final_criticality_level);
CREATE INDEX IF NOT EXISTS idx_anomalies_equipment ON public.anomalies(num_equipement);
CREATE INDEX IF NOT EXISTS idx_anomalies_created_at ON public.anomalies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_responsible ON public.anomalies(responsable);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_anomalies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_anomalies_updated_at
    BEFORE UPDATE ON public.anomalies
    FOR EACH ROW
    EXECUTE FUNCTION update_anomalies_updated_at();

-- Enable RLS
ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations for authenticated users" ON public.anomalies
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow anonymous read access for demo purposes
CREATE POLICY "Allow anonymous read access" ON public.anomalies
    FOR SELECT USING (true);

-- Insert sample data
INSERT INTO public.anomalies (
    num_equipement,
    description, 
    service, 
    responsable, 
    status, 
    source_origine,
    ai_fiabilite_integrite_score,
    ai_disponibilite_score,
    ai_process_safety_score,
    ai_criticality_level,
    estimated_hours,
    priority
) VALUES 
(
    'P-101',
    'Vibrations anormales détectées sur la pompe centrifuge P-101 du circuit de refroidissement principal. Amplitude dépassant les limites acceptables.',
    'Production',
    'Ahmed Bennani',
    'en_cours',
    'Inspection préventive',
    4,
    3,
    4,
    12,
    16,
    1
),
(
    'V-205',
    'Fuite externe détectée au niveau du presse-étoupe de la vanne de régulation V-205. Débit de fuite estimé à 2 l/h.',
    'Instrumentation',
    'Fatima Zahra',
    'nouvelle',
    'Rapport opérateur',
    3,
    3,
    3,
    8,
    8,
    2
),
(
    'R-301',
    'Corrosion externe observée sur la paroi du réservoir R-301, zone exposée aux intempéries. Épaisseur résiduelle à vérifier.',
    'Intégrité',
    'Hassan Alami',
    'nouvelle',
    'Inspection NDT',
    4,
    4,
    5,
    14,
    24,
    1
),
(
    'TE-402',
    'Le capteur de température TE-402 affiche des valeurs erratiques. Écart de ±5°C par rapport aux capteurs adjacents.',
    'Instrumentation',
    'Youssef Idrissi',
    'traite',
    'Système de monitoring',
    2,
    2,
    2,
    3,
    4,
    3
),
(
    'M-501',
    'Analyse vibratoire révèle une usure avancée des paliers du moteur M-501. Recommandation de remplacement préventif.',
    'Maintenance',
    'Karim Benjelloun',
    'nouvelle',
    'Maintenance préventive',
    4,
    3,
    4,
    8,
    12,
    2
);

-- Create a view for easy querying
CREATE OR REPLACE VIEW anomalies_with_scores AS
SELECT 
    *,
    CASE 
        WHEN human_fiabilite_integrite_score IS NOT NULL THEN 
            (human_fiabilite_integrite_score + 
             COALESCE(human_disponibilite_score, ai_disponibilite_score) + 
             COALESCE(human_process_safety_score, ai_process_safety_score)) / 3
        ELSE 
            (ai_fiabilite_integrite_score + ai_disponibilite_score + ai_process_safety_score) / 3
    END as average_score,
    CASE 
        WHEN human_criticality_level IS NOT NULL THEN human_criticality_level
        ELSE ai_criticality_level
    END as effective_criticality
FROM public.anomalies;
