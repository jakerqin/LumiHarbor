import { apiClient } from './client';
import type { Asset } from './types';

export interface Album {
  id: number;
  name: string;
  description: string;
  coverUrl: string;
  coverPreviewUrl?: string;
  coverOriginalUrl?: string;
  assetCount: number;
  createdAt: string;
  startTime?: string;
  endTime?: string;
}

export interface AlbumDetail extends Album {
  assets: Asset[];
}

export interface AlbumsResponse {
  albums: Album[];
  total: number;
  page: number;
  pageSize: number;
}

interface BackendAlbum {
  id: number;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  cover_asset_id: number | null;
  visibility: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  asset_count: number | null;
  cover_thumbnail_url?: string | null;
  cover_preview_url?: string | null;
  cover_original_url?: string | null;
}

interface BackendAlbumsPageResponse {
  albums: BackendAlbum[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

function toAlbum(dto: BackendAlbum): Album {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description ?? '',
    coverUrl: dto.cover_thumbnail_url || '/icon.svg',
    coverPreviewUrl: dto.cover_preview_url ?? undefined,
    coverOriginalUrl: dto.cover_original_url ?? undefined,
    assetCount: dto.asset_count ?? 0,
    createdAt: dto.created_at,
    startTime: dto.start_time ?? undefined,
    endTime: dto.end_time ?? undefined,
  };
}

export const albumsApi = {
  // 获取相册列表
  getAlbums: async (
    page: number = 1,
    pageSize: number = 20,
    filter?: { name?: string; shot_at_start?: string; shot_at_end?: string }
  ): Promise<AlbumsResponse> => {
    const skip = (page - 1) * pageSize;
    const params: Record<string, any> = {
      skip,
      limit: pageSize,
      sort_by: 'created_at',
      order: 'desc',
    };

    // 添加筛选参数（注意：后端使用 search 而不是 name）
    if (filter?.name) params.search = filter.name;
    if (filter?.shot_at_start) params.start_time_from = filter.shot_at_start;
    if (filter?.shot_at_end) params.end_time_to = filter.shot_at_end;

    const response = await apiClient.get<BackendAlbumsPageResponse>('/albums', { params });

    return {
      albums: response.data.albums.map(toAlbum),
      total: response.data.total,
      page,
      pageSize,
    };
  },

  // 获取相册详情
  getAlbum: async (id: number): Promise<AlbumDetail> => {
    const [albumResponse, assetsResponse] = await Promise.all([
      apiClient.get<BackendAlbum>(`/albums/${id}`),
      apiClient.get<Asset[]>(`/albums/${id}/assets`, { params: { skip: 0, limit: 1000 } }),
    ]);

    const album = toAlbum(albumResponse.data);
    return {
      ...album,
      assets: assetsResponse.data,
    };
  },

  // 创建相册
  createAlbum: async (data: {
    name: string;
    description?: string;
    start_time?: string;
    end_time?: string;
    cover_asset_id?: number;
  }): Promise<Album> => {
    const response = await apiClient.post<BackendAlbum>('/albums', {
      name: data.name,
      description: data.description || '',
      start_time: data.start_time || null,
      end_time: data.end_time || null,
      cover_asset_id: data.cover_asset_id || null,
      visibility: 'general',
    });
    return toAlbum(response.data);
  },
};
