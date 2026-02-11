import { apiClient } from './client';
import { Location, TimelineNote, FeaturedResponse } from './types';

// 当前用户ID（v1.0 硬编码，v2.0 从登录态获取）
const CURRENT_USER_ID = 1;

export const homeApi = {
  // 获取精选内容（使用真实 API）
  getFeatured: async (limit: number = 9): Promise<FeaturedResponse> => {
    const response = await apiClient.get<FeaturedResponse>(
      '/home/featured',
      { params: { user_id: CURRENT_USER_ID, limit } }
    );
    return response.data;
  },

  // 获取足迹地点（使用 Mock 数据）
  getLocations: async (): Promise<Location[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<{ locations: Location[] }>>('/api/v1/home/locations');
    // return response.data.locations;

    // Mock 数据
    return Array.from({ length: 5 }, (_, i) => ({
      locationId: `loc_${i}`,
      latitude: 39.9 + i * 5,
      longitude: 116.4 + i * 5,
      name: `城市 ${i + 1}`,
      country: '中国',
      assetCount: Math.floor(Math.random() * 100) + 50,
      firstVisit: new Date(2023, 5, 10).toISOString(),
      lastVisit: new Date(2024, 7, 15).toISOString(),
      coverAssets: [],
    }));
  },

  // 获取笔记时间轴（使用真实 API）
  getTimeline: async (limit: number = 10): Promise<TimelineNote[]> => {
    const response = await apiClient.get<{ notes: TimelineNote[] }>(
      '/home/timeline',
      { params: { limit, created_by: CURRENT_USER_ID } }
    );
    return response.data.notes;
  },
};
