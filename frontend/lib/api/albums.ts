import { apiClient } from './client';
import type { Asset } from './types';

export interface Album {
  id: number;
  name: string;
  description: string;
  coverUrl: string;
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
  cover_thumbnail_path?: string | null;
  cover_thumbnail_url?: string | null;
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
    assetCount: dto.asset_count ?? 0,
    createdAt: dto.created_at,
    startTime: dto.start_time ?? undefined,
    endTime: dto.end_time ?? undefined,
  };
}

export const albumsApi = {
  // 获取相册列表
  getAlbums: async (page: number = 1, pageSize: number = 20): Promise<AlbumsResponse> => {
    const skip = (page - 1) * pageSize;
    const response = await apiClient.get<BackendAlbumsPageResponse>('/albums', {
      params: {
        skip,
        limit: pageSize,
        sort_by: 'created_at',
        order: 'desc',
      },
    });

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
  createAlbum: async (name: string, description: string): Promise<Album> => {
    const response = await apiClient.post<BackendAlbum>('/albums', {
      name,
      description,
      visibility: 'general',
    });
    return toAlbum(response.data);
  },
};
