export interface Asset {
  id: number;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  shotAt: string;
  createdAt: string;
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  tags: string[];
  aiScore?: number;
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
