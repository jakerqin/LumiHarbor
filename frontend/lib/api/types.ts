export interface Asset {
  id: number;
  asset_type: 'image' | 'video' | 'audio';
  thumbnail_path: string | null;
  thumbnail_url?: string | null;
  original_path: string;
  original_url?: string | null;
  mime_type: string | null;
  file_size: number;
  shot_at: string | null;
  created_at: string;
  updated_at: string;
  is_favorited: boolean;
  aspect_ratio: number | null;
  location_city: string | null;
  location_poi: string | null;
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
  code: string;
  message: string;
  result: T | null;
}

export interface FeaturedResponse {
  assets: FeaturedAsset[];
  total: number;
  userId: number;
}

export interface FeaturedAsset {
  id: number;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl: string;
  originalUrl: string;
  fileName: string;
  fileSize: number;
  aspectRatio: 'horizontal' | 'vertical' | 'square';
  shotAt: string | null;
  createdAt: string;
  favoritedAt: string | null;
  isFavorited: boolean;
  tags: Record<string, string | null>;
}
