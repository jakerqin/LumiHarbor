import { apiClient } from './client';
import type { Asset } from './types';

const CURRENT_USER_ID = 1;

export interface TrashItem {
  id: number;
  asset_type: Asset['asset_type'];
  mime_type: string | null;
  file_size: number | null;
  shot_at: string | null;
  aspect_ratio: number | null;
  /** 指向 recycle_bin 下的缩略图，可能为空 */
  thumbnail_url: string | null;
  deleted_at: string;
  expires_at: string | null;
  /** 距离彻底删除剩余天数；自动清理关闭时为 null */
  days_left: number | null;
  restorable: boolean;
  reason: string | null;
}

export interface TrashListResponse {
  items: TrashItem[];
  total: number;
  /** 0 表示不自动清理 */
  retention_days: number;
}

export interface TrashRestoreResponse {
  restored: number[];
  failed: { asset_id: number; reason: string }[];
}

export const trashApi = {
  list: async (): Promise<TrashListResponse> => {
    const response = await apiClient.get<TrashListResponse>('/trash', {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  restore: async (assetIds: number[]): Promise<TrashRestoreResponse> => {
    const response = await apiClient.post<TrashRestoreResponse>(
      '/trash/restore',
      { asset_ids: assetIds },
      { params: { user_id: CURRENT_USER_ID } }
    );
    return response.data;
  },
};

/** 回收站条目转成瀑布流用的 Asset（复用 AssetMasonry） */
export function trashItemToAsset(item: TrashItem): Asset {
  return {
    id: item.id,
    asset_type: item.asset_type,
    thumbnail_path: null,
    thumbnail_url: item.thumbnail_url,
    original_path: '',
    mime_type: item.mime_type,
    file_size: item.file_size ?? 0,
    shot_at: item.shot_at,
    created_at: item.deleted_at,
    updated_at: item.deleted_at,
    is_favorited: false,
    aspect_ratio: item.aspect_ratio,
    location_city: null,
    location_poi: null,
  };
}
