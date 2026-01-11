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

export const albumsApi = {
  // 获取相册列表
  getAlbums: async (page: number = 1, pageSize: number = 20): Promise<AlbumsResponse> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<AlbumsResponse>>('/api/albums', {
    //   params: { page, pageSize }
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 500));

    const total = 48;
    const actualLength = Math.min(pageSize, Math.max(0, total - (page - 1) * pageSize));
    const mockAlbums: Album[] = Array.from({ length: actualLength }, (_, i) => {
      const index = (page - 1) * pageSize + i;

      const albumNames = [
        '日本之旅',
        '家庭聚会',
        '春日樱花',
        '夏日海边',
        '秋日红叶',
        '冬日雪景',
        '工作记录',
        '美食探店',
        '宠物日常',
        '运动健身',
      ];

      return {
        id: index + 1,
        name: albumNames[index % albumNames.length] + ` ${Math.floor(index / 10) + 1}`,
        description: '记录生活中的美好瞬间',
        coverUrl: `https://picsum.photos/800/600?random=${index + 300}`,
        assetCount: 50 + index * 5,
        createdAt: new Date(2024, 0, (index % 28) + 1).toISOString(),
        startTime: new Date(2024, 0, (index % 28) + 1).toISOString(),
        endTime: new Date(2024, 0, (index % 28) + 7).toISOString(),
      };
    });

    return {
      albums: mockAlbums,
      total,
      page,
      pageSize,
    };
  },

  // 获取相册详情
  getAlbum: async (id: number): Promise<AlbumDetail> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<AlbumDetail>>(`/api/albums/${id}`);
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockAssets: Asset[] = Array.from({ length: 24 }, (_, i) => ({
      id: i + 1,
      type: i % 4 === 0 ? ('video' as const) : ('image' as const),
      thumbnailUrl: `https://picsum.photos/600/400?random=${id * 100 + i}`,
      originalUrl: `https://picsum.photos/1920/1080?random=${id * 100 + i}`,
      shotAt: new Date(2024, 0, (i % 28) + 1).toISOString(),
      location: {
        latitude: 35.6762 + i * 0.01,
        longitude: 139.6503 + i * 0.01,
        name: '东京',
      },
      tags: ['旅行', '风景'],
      aiScore: 0.8 + i * 0.01,
    }));

    return {
      id,
      name: '日本之旅',
      description: '2024年春天的日本七日游，游览了东京、大阪、京都等城市',
      coverUrl: `https://picsum.photos/1200/800?random=${id}`,
      assetCount: mockAssets.length,
      createdAt: new Date(2024, 2, 15).toISOString(),
      startTime: new Date(2024, 2, 15).toISOString(),
      endTime: new Date(2024, 2, 21).toISOString(),
      assets: mockAssets,
    };
  },

  // 创建相册
  createAlbum: async (name: string, description: string): Promise<Album> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.post<ApiResponse<Album>>('/api/albums', {
    //   name,
    //   description
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      id: Date.now(),
      name,
      description,
      coverUrl: 'https://picsum.photos/800/600?random=999',
      assetCount: 0,
      createdAt: new Date().toISOString(),
    };
  },
};
