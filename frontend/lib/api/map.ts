import { apiClient } from './client';
import { FootprintsResponse, FootprintDetail, MapStatistics } from './types';

// 当前用户ID（v1.0 硬编码，v2.0 从登录态获取）
const CURRENT_USER_ID = 1;

export const mapApi = {
  /** 获取足迹点列表（按地理位置聚合） */
  getFootprints: async (params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<FootprintsResponse> => {
    const response = await apiClient.get<FootprintsResponse>(
      '/map/footprints',
      { params: { user_id: CURRENT_USER_ID, ...params } }
    );
    return response.data;
  },

  /** 获取足迹点详情 */
  getFootprintDetail: async (footprintId: string): Promise<FootprintDetail> => {
    const response = await apiClient.get<FootprintDetail>(
      `/map/footprints/${footprintId}`,
      { params: { user_id: CURRENT_USER_ID } }
    );
    return response.data;
  },

  /** 获取地图统计数据 */
  getStatistics: async (): Promise<MapStatistics> => {
    const response = await apiClient.get<MapStatistics>(
      '/map/statistics',
      { params: { user_id: CURRENT_USER_ID } }
    );
    return response.data;
  },
};
