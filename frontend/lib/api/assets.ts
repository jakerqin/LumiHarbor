import { apiClient } from './client';
import type { Asset, ApiResponse } from './types';

// 当前用户ID（v1.0 硬编码，v2.0 从登录态获取）
const CURRENT_USER_ID = 1;

export interface AssetsFilter {
  type?: 'image' | 'video' | 'audio';
  startDate?: string;
  endDate?: string;
  location?: string;
  tags?: string[];
  sortBy?: 'shotAt' | 'createdAt' | 'aiScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
  page: number;
  pageSize: number;
}

export const assetsApi = {
  // 获取素材列表
  getAssets: async (
    page: number = 1,
    pageSize: number = 30,
    filter?: AssetsFilter
  ): Promise<AssetsResponse> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<AssetsResponse>>('/api/assets', {
    //   params: { page, pageSize, ...filter }
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 500));

    const total = 120;
    const mockAssets: Asset[] = Array.from({ length: pageSize }, (_, i) => {
      const index = (page - 1) * pageSize + i;
      if (index >= total) return null;

      const type = index % 3 === 0 ? 'video' : 'image';
      const location = ['上海', '北京', '杭州', '成都', '深圳'][index % 5];

      return {
        id: index + 1,
        type: type as 'image' | 'video',
        thumbnailUrl: `https://picsum.photos/400/300?random=${index}`,
        originalUrl: `https://picsum.photos/1920/1080?random=${index}`,
        shotAt: new Date(2024, 0, (index % 28) + 1).toISOString(),
        location: {
          latitude: 30 + index * 0.1,
          longitude: 120 + index * 0.1,
          name: location,
        },
        tags: ['旅行', '风景', '美食'][index % 3] ? ['旅行'] : ['风景'],
        aiScore: 0.7 + (index % 30) * 0.01,
      };
    }).filter((a): a is Asset => a !== null);

    return {
      assets: mockAssets,
      total,
      page,
      pageSize,
    };
  },

  // 获取单个素材详情
  getAsset: async (id: number): Promise<Asset> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<Asset>>(`/api/assets/${id}`);
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      id,
      type: 'image',
      thumbnailUrl: `https://picsum.photos/400/300?random=${id}`,
      originalUrl: `https://picsum.photos/1920/1080?random=${id}`,
      shotAt: new Date(2024, 0, 15).toISOString(),
      location: {
        latitude: 31.2304,
        longitude: 121.4737,
        name: '上海',
      },
      tags: ['旅行', '风景'],
      aiScore: 0.95,
    };
  },

  // 获取所有标签
  getTags: async (): Promise<string[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<string[]>>('/api/assets/tags');
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 200));

    return ['旅行', '风景', '美食', '家庭', '朋友', '工作', '运动', '宠物'];
  },

  // 获取所有地点
  getLocations: async (): Promise<string[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<string[]>>('/api/assets/locations');
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 200));

    return ['上海', '北京', '杭州', '成都', '深圳', '广州', '南京', '苏州'];
  },

  /**
   * 收藏素材
   */
  favorite: async (assetId: number): Promise<void> => {
    await apiClient.post(
      `/assets/${assetId}/favorite`,
      null,
      { params: { user_id: CURRENT_USER_ID } }
    );
  },

  /**
   * 取消收藏
   */
  unfavorite: async (assetId: number): Promise<void> => {
    await apiClient.delete(
      `/assets/${assetId}/favorite`,
      { params: { user_id: CURRENT_USER_ID } }
    );
  },
};
