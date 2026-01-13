import { apiClient } from './client';
import type { Asset } from './types';

// 当前用户ID（v1.0 硬编码，v2.0 从登录态获取）
const CURRENT_USER_ID = 1;

export interface AssetsFilter {
  asset_type?: 'image' | 'video' | 'audio';
  location?: string;
  sort_by?: 'shot_at' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface SimilarAsset {
  id: number;
  asset_type: 'image' | 'video' | 'audio';
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  original_url: string | null;
  shot_at: string | null;
  is_favorited: boolean;
  distance: number;
  similarity: number;
}

export interface SimilarAssetsResponse {
  assets: SimilarAsset[];
  total: number;
  threshold: number;
  has_phash: boolean;
}

export const assetsApi = {
  // 获取素材列表
  getAssets: async (
    page: number = 1,
    pageSize: number = 30,
    filter?: AssetsFilter
  ): Promise<AssetsResponse> => {
    const response = await apiClient.get<AssetsResponse>('/assets', {
      params: {
        page,
        page_size: pageSize,
        user_id: CURRENT_USER_ID,
        ...filter,
      }
    });
    return response.data;
  },

  // 获取单个素材详情
  getAsset: async (id: number): Promise<Asset> => {
    const response = await apiClient.get<Asset>(`/assets/${id}`, {
      params: { user_id: CURRENT_USER_ID }
    });
    return response.data;
  },

  // 获取素材标签（key/value）
  getAssetTags: async (id: number): Promise<Record<string, string | null>> => {
    const response = await apiClient.get<Record<string, string | null>>(`/assets/${id}/tags`);
    return response.data;
  },

  // 获取相似素材推荐（基于 phash）
  getSimilarAssets: async (
    id: number,
    options?: { threshold?: number; limit?: number }
  ): Promise<SimilarAssetsResponse> => {
    const response = await apiClient.get<SimilarAssetsResponse>(`/assets/${id}/similar`, {
      params: {
        user_id: CURRENT_USER_ID,
        threshold: options?.threshold,
        limit: options?.limit,
      },
    });
    return response.data;
  },

  // 获取所有标签
  getTags: async (): Promise<string[]> => {
    // TODO: 后端实现标签列表接口
    const response = await apiClient.get<string[]>('/assets/tags');
    return response.data;
  },

  // 获取所有地点
  getLocations: async (): Promise<string[]> => {
    // TODO: 后端实现地点列表接口
    const response = await apiClient.get<string[]>('/assets/locations');
    return response.data;
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
