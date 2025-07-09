import { supabase } from '../lib/supabase';
import { Anomaly } from '../types';
import { combineFiabiliteIntegrite } from '../lib/scoringUtils';

export interface BackendAnomaly {
  id: string;
  num_equipement: string;
  description: string;
  service: string;
  responsable: string;
  status: 'new' | 'in_progress' | 'treated' | 'closed';
  source_origine: string;
  created_at: string;
  updated_at: string;
  
  // AI Predictions (backend still uses separate scores)
  fiabilite_score: number;
  integrite_score: number;
  disponibilite_score: number;
  process_safety_score: number;
  criticality_level: 'low' | 'medium' | 'high' | 'critical';
  
  // User overrides
  user_fiabilite_score?: number;
  user_integrite_score?: number;
  user_disponibilite_score?: number;
  user_process_safety_score?: number;
  user_criticality_level?: 'low' | 'medium' | 'high' | 'critical';
  use_user_scores?: boolean;
  
  // Optional fields
  estimated_hours?: number;
  priority?: number;
  maintenance_window_id?: string;
  
  // Metadata
  last_modified_by?: string;
  last_modified_at?: string;
}

export interface CreateAnomalyData {
  num_equipement: string;
  description: string;
  service: string;
  responsable: string;
  source_origine: string;
  status?: 'new' | 'in_progress' | 'treated' | 'closed';
  estimated_hours?: number;
  priority?: number;
  
  // User score overrides
  user_fiabilite_score?: number;
  user_integrite_score?: number;
  user_disponibilite_score?: number;
  user_process_safety_score?: number;
  use_user_scores?: boolean;
}

export interface UpdateAnomalyData extends Partial<CreateAnomalyData> {
  maintenance_window_id?: string;
}

export interface AnomalyFilters {
  status?: string;
  service?: string;
  criticality_level?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface BatchCreateData {
  anomalies: CreateAnomalyData[];
}

export interface BulkStatusUpdateData {
  anomaly_ids: string[];
  status: 'new' | 'in_progress' | 'treated' | 'closed';
}

export class AnomalyService {
  private readonly RAILWAY_URL = 'https://tams-model-production.up.railway.app';

  // Convert BackendAnomaly to frontend Anomaly format
  private convertToFrontendAnomaly(backendAnomaly: BackendAnomaly): Anomaly {
    return {
      id: backendAnomaly.id,
      title: backendAnomaly.description.substring(0, 50) + '...', // Extract title from description
      description: backendAnomaly.description,
      equipmentId: backendAnomaly.num_equipement,
      service: backendAnomaly.service,
      responsiblePerson: backendAnomaly.responsable,
      status: backendAnomaly.status,
      originSource: backendAnomaly.source_origine,
      createdAt: new Date(backendAnomaly.created_at),
      updatedAt: new Date(backendAnomaly.updated_at),
      
      // Convert separate scores to combined format
      fiabiliteIntegriteScore: combineFiabiliteIntegrite(
        backendAnomaly.fiabilite_score,
        backendAnomaly.integrite_score
      ),
      disponibiliteScore: (backendAnomaly.disponibilite_score / 10) * 5, // Convert to /5 scale
      processSafetyScore: (backendAnomaly.process_safety_score / 10) * 5, // Convert to /5 scale
      criticalityLevel: backendAnomaly.criticality_level,
      
      // User overrides
      userFiabiliteIntegriteScore: backendAnomaly.user_fiabilite_score && backendAnomaly.user_integrite_score
        ? combineFiabiliteIntegrite(backendAnomaly.user_fiabilite_score, backendAnomaly.user_integrite_score)
        : undefined,
      userDisponibiliteScore: backendAnomaly.user_disponibilite_score 
        ? (backendAnomaly.user_disponibilite_score / 10) * 5 
        : undefined,
      userProcessSafetyScore: backendAnomaly.user_process_safety_score 
        ? (backendAnomaly.user_process_safety_score / 10) * 5 
        : undefined,
      userCriticalityLevel: backendAnomaly.user_criticality_level,
      useUserScores: backendAnomaly.use_user_scores,
      
      // Optional fields
      estimatedHours: backendAnomaly.estimated_hours,
      priority: backendAnomaly.priority,
      maintenanceWindowId: backendAnomaly.maintenance_window_id,
      lastModifiedBy: backendAnomaly.last_modified_by,
      lastModifiedAt: backendAnomaly.last_modified_at ? new Date(backendAnomaly.last_modified_at) : undefined
    };
  }

  // Convert frontend Anomaly to backend format
  private convertToBackendFormat(anomaly: Partial<Anomaly>): Partial<CreateAnomalyData> {
    return {
      num_equipement: anomaly.equipmentId,
      description: anomaly.description,
      service: anomaly.service,
      responsable: anomaly.responsiblePerson,
      source_origine: anomaly.originSource,
      status: anomaly.status,
      estimated_hours: anomaly.estimatedHours,
      priority: anomaly.priority,
      
      // Convert combined scores back to separate scores (if user scores are provided)
      user_fiabilite_score: anomaly.userFiabiliteIntegriteScore ? anomaly.userFiabiliteIntegriteScore * 2 : undefined,
      user_integrite_score: anomaly.userFiabiliteIntegriteScore ? anomaly.userFiabiliteIntegriteScore * 2 : undefined,
      user_disponibilite_score: anomaly.userDisponibiliteScore ? anomaly.userDisponibiliteScore * 2 : undefined,
      user_process_safety_score: anomaly.userProcessSafetyScore ? anomaly.userProcessSafetyScore * 2 : undefined,
      use_user_scores: anomaly.useUserScores
    };
  }

  // Sync anomalies from Railway to Supabase
  async syncAnomaliesFromRailway(): Promise<Anomaly[]> {
    try {
      const response = await fetch(`${this.RAILWAY_URL}/anomalies`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const backendAnomalies: BackendAnomaly[] = await response.json();
      const frontendAnomalies = backendAnomalies.map(a => this.convertToFrontendAnomaly(a));
      
      // Store in Supabase
      const { error } = await supabase
        .from('anomalies')
        .upsert(frontendAnomalies.map(a => ({
          id: a.id,
          title: a.title,
          description: a.description,
          equipment_id: a.equipmentId,
          service: a.service,
          responsible_person: a.responsiblePerson,
          status: a.status,
          origin_source: a.originSource,
          created_at: a.createdAt.toISOString(),
          updated_at: a.updatedAt.toISOString(),
          fiabilite_integrite_score: a.fiabiliteIntegriteScore,
          disponibilite_score: a.disponibiliteScore,
          process_safety_score: a.processSafetyScore,
          criticality_level: a.criticalityLevel,
          user_fiabilite_integrite_score: a.userFiabiliteIntegriteScore,
          user_disponibilite_score: a.userDisponibiliteScore,
          user_process_safety_score: a.userProcessSafetyScore,
          user_criticality_level: a.userCriticalityLevel,
          use_user_scores: a.useUserScores,
          estimated_hours: a.estimatedHours,
          priority: a.priority,
          maintenance_window_id: a.maintenanceWindowId,
          last_modified_by: a.lastModifiedBy,
          last_modified_at: a.lastModifiedAt?.toISOString()
        })));
      
      if (error) {
        console.error('Error syncing to Supabase:', error);
      }
      
      return frontendAnomalies;
    } catch (error) {
      console.error('Error syncing anomalies:', error);
      return [];
    }
  }

  // Get all anomalies from Supabase using actual table schema
  async getAllAnomalies(filters: AnomalyFilters = {}): Promise<Anomaly[]> {
    try {
      let query = supabase.from('anomalies').select('*');
      
      // Apply filters based on actual table structure
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.service) {
        query = query.eq('service', filters.service);
      }
      if (filters.criticality_level) {
        query = query.eq('final_criticality_level', filters.criticality_level);
      }
      if (filters.search) {
        query = query.or(`description.ilike.%${filters.search}%,num_equipement.ilike.%${filters.search}%,service.ilike.%${filters.search}%`);
      }
      
      // Pagination
      if (filters.page && filters.per_page) {
        const from = (filters.page - 1) * filters.per_page;
        const to = from + filters.per_page - 1;
        query = query.range(from, to);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching from Supabase:', error);
        return [];
      }
      
      // Convert Supabase data to frontend format
      return data?.map(row => {
        console.log('Supabase row:', row); // Debug log
        return {
          id: row.id,
          title: row.num_equipement || 'Anomalie', // Use equipment number as title
          description: row.description || '',
          equipmentId: row.num_equipement || '',
          service: row.service || '',
          responsiblePerson: row.responsable || '',
          status: this.mapStatus(row.status || 'nouvelle'),
          originSource: row.source_origine || '',
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          
          // Map scoring system (convert from 1-5 to 0-5 scale)
          fiabiliteIntegriteScore: row.final_fiabilite_integrite_score || row.ai_fiabilite_integrite_score || 2.5,
          disponibiliteScore: row.final_disponibilite_score || row.ai_disponibilite_score || 2.5,
          processSafetyScore: row.final_process_safety_score || row.ai_process_safety_score || 2.5,
          criticalityLevel: this.mapCriticalityLevel(row.final_criticality_level || row.ai_criticality_level || 8),
          
          // User overrides
          userFiabiliteIntegriteScore: row.human_fiabilite_integrite_score,
          userDisponibiliteScore: row.human_disponibilite_score,
          userProcessSafetyScore: row.human_process_safety_score,
          userCriticalityLevel: row.human_criticality_level ? this.mapCriticalityLevel(row.human_criticality_level) : undefined,
          useUserScores: !!(row.human_fiabilite_integrite_score || row.human_disponibilite_score || row.human_process_safety_score),
          
          // Optional fields
          estimatedHours: row.estimated_hours,
          priority: row.priority || 1,
          maintenanceWindowId: row.maintenance_window_id,
          lastModifiedBy: undefined,
          lastModifiedAt: undefined
        };
      }) || [];
    } catch (error) {
      console.error('Error in getAllAnomalies:', error);
      return [];
    }
  }

  // Map status from database to frontend format
  private mapStatus(dbStatus: string): 'new' | 'in_progress' | 'treated' | 'closed' {
    switch (dbStatus) {
      case 'nouvelle': return 'new';
      case 'en_cours': return 'in_progress';
      case 'traite': return 'treated';
      case 'cloture': return 'closed';
      default: return 'new';
    }
  }

  // Map criticality level from 1-15 scale to text
  private mapCriticalityLevel(level: number): 'low' | 'medium' | 'high' | 'critical' {
    if (level <= 3) return 'low';
    if (level <= 6) return 'medium';
    if (level <= 12) return 'high';
    return 'critical';
  }

  async getAnomaly(id: string): Promise<Anomaly | null> {
    try {
      const { data, error } = await supabase
        .from('anomalies')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        equipmentId: data.equipment_id,
        service: data.service,
        responsiblePerson: data.responsible_person,
        status: data.status,
        originSource: data.origin_source,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        fiabiliteIntegriteScore: data.fiabilite_integrite_score,
        disponibiliteScore: data.disponibilite_score,
        processSafetyScore: data.process_safety_score,
        criticalityLevel: data.criticality_level,
        userFiabiliteIntegriteScore: data.user_fiabilite_integrite_score,
        userDisponibiliteScore: data.user_disponibilite_score,
        userProcessSafetyScore: data.user_process_safety_score,
        userCriticalityLevel: data.user_criticality_level,
        useUserScores: data.use_user_scores,
        estimatedHours: data.estimated_hours,
        priority: data.priority,
        maintenanceWindowId: data.maintenance_window_id,
        lastModifiedBy: data.last_modified_by,
        lastModifiedAt: data.last_modified_at ? new Date(data.last_modified_at) : undefined
      };
    } catch (error) {
      console.error('Error fetching anomaly:', error);
      return null;
    }
  }

  async createAnomaly(anomalyData: Partial<Anomaly>): Promise<Anomaly | null> {
    try {
      // Send to Railway backend first
      const backendData = this.convertToBackendFormat(anomalyData);
      const response = await fetch(`${this.RAILWAY_URL}/store/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backendData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const backendAnomaly: BackendAnomaly = await response.json();
      const frontendAnomaly = this.convertToFrontendAnomaly(backendAnomaly);
      
      // Also store in Supabase
      const { error } = await supabase
        .from('anomalies')
        .insert({
          id: frontendAnomaly.id,
          title: frontendAnomaly.title,
          description: frontendAnomaly.description,
          equipment_id: frontendAnomaly.equipmentId,
          service: frontendAnomaly.service,
          responsible_person: frontendAnomaly.responsiblePerson,
          status: frontendAnomaly.status,
          origin_source: frontendAnomaly.originSource,
          created_at: frontendAnomaly.createdAt.toISOString(),
          updated_at: frontendAnomaly.updatedAt.toISOString(),
          fiabilite_integrite_score: frontendAnomaly.fiabiliteIntegriteScore,
          disponibilite_score: frontendAnomaly.disponibiliteScore,
          process_safety_score: frontendAnomaly.processSafetyScore,
          criticality_level: frontendAnomaly.criticalityLevel,
          user_fiabilite_integrite_score: frontendAnomaly.userFiabiliteIntegriteScore,
          user_disponibilite_score: frontendAnomaly.userDisponibiliteScore,
          user_process_safety_score: frontendAnomaly.userProcessSafetyScore,
          user_criticality_level: frontendAnomaly.userCriticalityLevel,
          use_user_scores: frontendAnomaly.useUserScores,
          estimated_hours: frontendAnomaly.estimatedHours,
          priority: frontendAnomaly.priority,
          maintenance_window_id: frontendAnomaly.maintenanceWindowId,
          last_modified_by: frontendAnomaly.lastModifiedBy,
          last_modified_at: frontendAnomaly.lastModifiedAt?.toISOString()
        });
      
      if (error) {
        console.error('Error storing in Supabase:', error);
      }
      
      return frontendAnomaly;
    } catch (error) {
      console.error('Error creating anomaly:', error);
      return null;
    }
  }

  async updateAnomaly(id: string, updates: Partial<Anomaly>): Promise<Anomaly | null> {
    try {
      // Update in Supabase
      const { data, error } = await supabase
        .from('anomalies')
        .update({
          title: updates.title,
          description: updates.description,
          equipment_id: updates.equipmentId,
          service: updates.service,
          responsible_person: updates.responsiblePerson,
          status: updates.status,
          origin_source: updates.originSource,
          updated_at: new Date().toISOString(),
          fiabilite_integrite_score: updates.fiabiliteIntegriteScore,
          disponibilite_score: updates.disponibiliteScore,
          process_safety_score: updates.processSafetyScore,
          criticality_level: updates.criticalityLevel,
          user_fiabilite_integrite_score: updates.userFiabiliteIntegriteScore,
          user_disponibilite_score: updates.userDisponibiliteScore,
          user_process_safety_score: updates.userProcessSafetyScore,
          user_criticality_level: updates.userCriticalityLevel,
          use_user_scores: updates.useUserScores,
          estimated_hours: updates.estimatedHours,
          priority: updates.priority,
          maintenance_window_id: updates.maintenanceWindowId,
          last_modified_by: updates.lastModifiedBy,
          last_modified_at: updates.lastModifiedAt?.toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error || !data) {
        throw new Error('Failed to update anomaly');
      }
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        equipmentId: data.equipment_id,
        service: data.service,
        responsiblePerson: data.responsible_person,
        status: data.status,
        originSource: data.origin_source,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        fiabiliteIntegriteScore: data.fiabilite_integrite_score,
        disponibiliteScore: data.disponibilite_score,
        processSafetyScore: data.process_safety_score,
        criticalityLevel: data.criticality_level,
        userFiabiliteIntegriteScore: data.user_fiabilite_integrite_score,
        userDisponibiliteScore: data.user_disponibilite_score,
        userProcessSafetyScore: data.user_process_safety_score,
        userCriticalityLevel: data.user_criticality_level,
        useUserScores: data.use_user_scores,
        estimatedHours: data.estimated_hours,
        priority: data.priority,
        maintenanceWindowId: data.maintenance_window_id,
        lastModifiedBy: data.last_modified_by,
        lastModifiedAt: data.last_modified_at ? new Date(data.last_modified_at) : undefined
      };
    } catch (error) {
      console.error('Error updating anomaly:', error);
      return null;
    }
  }

  async deleteAnomaly(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anomalies')
        .delete()
        .eq('id', id);
      
      return !error;
    } catch (error) {
      console.error('Error deleting anomaly:', error);
      return false;
    }
  }

  async updateStatus(id: string, status: 'new' | 'in_progress' | 'treated' | 'closed'): Promise<Anomaly | null> {
    return this.updateAnomaly(id, { status });
  }

  async batchCreate(anomalies: Partial<Anomaly>[]): Promise<Anomaly[]> {
    const results: Anomaly[] = [];
    
    for (const anomaly of anomalies) {
      const created = await this.createAnomaly(anomaly);
      if (created) {
        results.push(created);
      }
    }
    
    return results;
  }

  async bulkUpdateStatus(anomalyIds: string[], status: 'new' | 'in_progress' | 'treated' | 'closed'): Promise<Anomaly[]> {
    const results: Anomaly[] = [];
    
    for (const id of anomalyIds) {
      const updated = await this.updateStatus(id, status);
      if (updated) {
        results.push(updated);
      }
    }
    
    return results;
  }
}

export const anomalyService = new AnomalyService();