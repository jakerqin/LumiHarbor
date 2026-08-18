import { apiClient } from './client';
import { TimelineNote, FeaturedResponse } from './types';

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

  // 获取笔记时间轴（使用真实 API）
  getTimeline: async (limit: number = 10): Promise<TimelineNote[]> => {
    const response = await apiClient.get<{ notes: TimelineNote[] }>(
      '/home/timeline',
      { params: { limit, created_by: CURRENT_USER_ID } }
    );
    return response.data.notes;
  },
};
