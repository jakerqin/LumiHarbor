import { apiClient } from './client';

export interface UploadAssetsResponse {
  status: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  location_tags: number;
}

export const ingestionApi = {
  uploadAssets: async (files: File[], locationPoi?: string): Promise<UploadAssetsResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (locationPoi) {
      formData.append('location_poi', locationPoi);
    }

    const response = await apiClient.post<UploadAssetsResponse>(
      '/ingestion/upload/batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
