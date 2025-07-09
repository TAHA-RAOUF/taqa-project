import { apiService, ApiResponse } from './apiService';

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
  
  // AI Predictions
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
  async getAllAnomalies(filters: AnomalyFilters = {}): Promise<ApiResponse<BackendAnomaly[]>> {
    return apiService.get<ApiResponse<BackendAnomaly[]>>('/anomalies', filters);
  }

  async getAnomaly(id: string): Promise<BackendAnomaly> {
    const response = await apiService.get<ApiResponse<BackendAnomaly>>(`/anomalies/${id}`);
    return response.data!;
  }

  async createAnomaly(anomalyData: CreateAnomalyData): Promise<BackendAnomaly> {
    const response = await apiService.post<ApiResponse<BackendAnomaly>>('/anomalies', anomalyData);
    return response.data!;
  }

  async updateAnomaly(id: string, updates: UpdateAnomalyData): Promise<BackendAnomaly> {
    const response = await apiService.put<ApiResponse<BackendAnomaly>>(`/anomalies/${id}`, updates);
    return response.data!;
  }

  async deleteAnomaly(id: string): Promise<void> {
    await apiService.delete(`/anomalies/${id}`);
  }

  async updateStatus(id: string, status: 'new' | 'in_progress' | 'treated' | 'closed'): Promise<BackendAnomaly> {
    const response = await apiService.put<ApiResponse<BackendAnomaly>>(`/anomalies/${id}/status`, { status });
    return response.data!;
  }

  async updatePredictions(id: string, predictions: {
    user_fiabilite_score: number;
    user_integrite_score: number;
    user_disponibilite_score: number;
    user_process_safety_score: number;
    use_user_scores: boolean;
  }): Promise<BackendAnomaly> {
    const response = await apiService.put<ApiResponse<BackendAnomaly>>(`/anomalies/${id}/predictions`, predictions);
    return response.data!;
  }

  async approvePredictions(id: string): Promise<BackendAnomaly> {
    const response = await apiService.post<ApiResponse<BackendAnomaly>>(`/anomalies/${id}/approve`);
    return response.data!;
  }

  async batchCreate(data: BatchCreateData): Promise<ApiResponse<BackendAnomaly[]>> {
    return apiService.post<ApiResponse<BackendAnomaly[]>>('/anomalies/batch', data);
  }

  async bulkUpdateStatus(data: BulkStatusUpdateData): Promise<ApiResponse<BackendAnomaly[]>> {
    return apiService.put<ApiResponse<BackendAnomaly[]>>('/anomalies/bulk/status', data);
  }
}

export const anomalyService = new AnomalyService();