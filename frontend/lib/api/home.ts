import { apiClient } from './client';
import { Asset, Location, Event, ApiResponse } from './types';

export const homeApi = {
  // 获取精选内容（使用 Mock 数据）
  getFeatured: async (limit: number = 9): Promise<Asset[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<{ assets: Asset[] }>>('/api/v1/home/featured', { params: { limit } });
    // return response.data.assets;

    // Mock 数据
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      type: 'image' as const,
      thumbnailUrl: `https://picsum.photos/800/600?random=${i}`,
      originalUrl: `https://picsum.photos/1920/1080?random=${i}`,
      fileName: `photo_${i}.jpg`,
      fileSize: 2048576,
      width: 1920,
      height: 1080,
      shotAt: new Date(2024, 7, 15 + i).toISOString(),
      createdAt: new Date().toISOString(),
      location: {
        latitude: 39.9 + Math.random(),
        longitude: 116.4 + Math.random(),
        name: '北京·天安门',
      },
      tags: ['旅行', '建筑', '蓝天'],
      aiScore: 0.95,
    }));
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

  // 获取大事件时间轴（使用 Mock 数据）
  getTimeline: async (limit: number = 10): Promise<Event[]> => {
    // TODO: 替换为真实 API
    // const response = await apiClient.get<ApiResponse<{ events: Event[] }>>('/api/v1/home/timeline', { params: { limit } });
    // return response.data.events;

    // Mock 数据
    return Array.from({ length: limit }, (_, i) => ({
      id: i + 1,
      title: `事件 ${i + 1}`,
      description: '这是一段描述文字，记录了这个特殊时刻的点点滴滴。',
      eventType: 'travel' as const,
      startDate: new Date(2024, 7 - i, 1).toISOString(),
      endDate: new Date(2024, 7 - i, 7).toISOString(),
      coverAsset: {
        id: i + 1,
        thumbnailUrl: `https://picsum.photos/800/600?random=${i + 100}`,
        type: 'image',
      },
      relatedAssets: {
        photoCount: Math.floor(Math.random() * 100) + 50,
        videoCount: Math.floor(Math.random() * 10),
      },
      location: {
        latitude: 39.9,
        longitude: 116.4,
        name: '北京',
      },
    }));
  },
};
