import { apiClient } from './client';
import type { LocationData } from '@/components/common/MapPicker';

export interface UploadAssetsResponse {
  status: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  location_tags: number;
}

export const ingestionApi = {
  uploadAssets: async (files: File[], locationData?: LocationData): Promise<UploadAssetsResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    // 添加位置数据
    if (locationData) {
      // 传递经纬度（格式：'经度,纬度'）
      const defaultGps = `${locationData.longitude},${locationData.latitude}`;
      formData.append('default_gps', defaultGps);

      // 传递地标名称（优先使用 poi，其次使用 city）
      const locationPoi = locationData.poi || locationData.city || locationData.district;
      if (locationPoi) {
        formData.append('location_poi', locationPoi);
      }
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
