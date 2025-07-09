import { apiService, ApiResponse } from './apiService';
import { BackendAnomaly } from './anomalyService';

export interface ImportResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  errors: Array<{
    row: number;
    errors: Record<string, string[]>;
  }>;
  imported_anomalies: BackendAnomaly[];
}

export class ImportService {
  async importAnomalies(file: File): Promise<ImportResult> {
    const response = await apiService.uploadFile<ApiResponse<ImportResult>>('/import/anomalies', file);
    return response.data!;
  }
}

export const importService = new ImportService();