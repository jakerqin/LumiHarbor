export interface Asset {
  id: number;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  aspectRatio?: 'horizontal' | 'vertical' | 'square';
  shotAt: string;
  createdAt: string;
  favoritedAt?: string;
  isFavorited?: boolean;
  tags: Record<string, any>;  // 标签 JSON 对象
  blurHash?: string;
}

export interface Location {
  locationId: string;
  latitude: number;
  longitude: number;
  name: string;
  country: string;
  assetCount: number;
  firstVisit: string;
  lastVisit: string;
  coverAssets: Array<{
    id: number;
    thumbnailUrl: string;
    type: string;
  }>;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  eventType: 'travel' | 'milestone' | 'celebration';
  startDate: string;
  endDate: string;
  coverAsset: {
    id: number;
    thumbnailUrl: string;
    type: string;
  };
  relatedAssets: {
    photoCount: number;
    videoCount: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface FeaturedResponse {
  assets: Asset[];
  total: number;
  userId: number;
}
