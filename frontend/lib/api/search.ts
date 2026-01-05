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

export interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface SearchResult {
  assets: Asset[];
  albums: Album[];
  notes: Note[];
}

export const searchApi = {
  // 全局搜索
  search: async (query: string): Promise<SearchResult> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<SearchResult>>('/api/search', {
    //   params: { q: query }
    // });
    // return response.data.data;

    // Mock 数据
    await new Promise((resolve) => setTimeout(resolve, 300));

    const mockAssets: Asset[] = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      type: i % 2 === 0 ? ('image' as const) : ('video' as const),
      thumbnailUrl: `https://picsum.photos/400/300?random=${i + 100}`,
      originalUrl: `https://picsum.photos/1920/1080?random=${i + 100}`,
      shotAt: new Date(2024, 0, i + 1).toISOString(),
      location: {
        latitude: 31.2304 + i * 0.1,
        longitude: 121.4737 + i * 0.1,
        name: ['上海', '苏州', '杭州'][i],
      },
      tags: ['旅行', '风景'],
      aiScore: 0.9 + i * 0.02,
    }));

    const mockAlbums: Album[] = Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      name: `${query} 相册 ${i + 1}`,
      description: '美好的回忆',
      coverUrl: `https://picsum.photos/600/400?random=${i + 200}`,
      assetCount: 50 + i * 20,
      createdAt: new Date(2024, 0, i + 10).toISOString(),
    }));

    const mockNotes: Note[] = Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      title: `${query} 笔记 ${i + 1}`,
      content: '这是一段关于旅行的美好回忆，记录了那些难忘的时刻...',
      createdAt: new Date(2024, 0, i + 15).toISOString(),
      updatedAt: new Date(2024, 0, i + 20).toISOString(),
      tags: ['旅行', '回忆'],
    }));

    return {
      assets: query.length > 0 ? mockAssets : [],
      albums: query.length > 0 ? mockAlbums : [],
      notes: query.length > 0 ? mockNotes : [],
    };
  },
};
