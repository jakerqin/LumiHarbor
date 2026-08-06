import { apiClient } from './client';
import type { LocationData } from '@/components/common/MapPicker';

export interface UploadAssetsResponse {
  status: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  location_tags: number;
  album?: AlbumAssociationResult | null;
}

export interface AlbumAssociationResult {
  album_id: number;
  album_name: string;
  action: 'found' | 'created';
}

/** 上传时的相册归属目标：不归入 / 归入已有相册 / 新建相册后归入 */
export type AlbumTarget =
  | { mode: 'none' }
  | { mode: 'existing'; albumId: number }
  | { mode: 'new'; name: string; description?: string; startTime?: string; endTime?: string };

export interface UploadSingleAssetResponse {
  status: string;
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  album: AlbumAssociationResult | null;
}

// 大文件（尤其视频）在 Wi-Fi 下耗时可能超过全局默认的 10 秒超时，单文件上传需要单独放宽
const SINGLE_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

function appendAlbumTarget(formData: FormData, album?: AlbumTarget): void {
  if (!album || album.mode === 'none') return;

  formData.append('import_to_album', 'true');
  if (album.mode === 'existing') {
    formData.append('album_id', String(album.albumId));
    return;
  }

  // mode === 'new'
  formData.append('album_name', album.name);
  if (album.description) formData.append('album_description', album.description);
  if (album.startTime) formData.append('album_start_time', album.startTime);
  if (album.endTime) formData.append('album_end_time', album.endTime);
}

export const ingestionApi = {
  uploadAssets: async (files: File[], locationData?: LocationData): Promise<UploadAssetsResponse> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    // 添加位置数据
    if (locationData) {
      // 传递经纬度（格式：'经度,纬度'）
      const defaultGps = `${locationData.longitude},${locationData.latitude}`;
      formData.append('default_gps', defaultGps);

      // 传递地标名称（优先使用 poi，其次使用 city）
      const locationPoi = locationData.poi || locationData.city || locationData.district;
      if (locationPoi) {
        formData.append('location_poi', locationPoi);
      }
    }

    const response = await apiClient.post<UploadAssetsResponse>(
      '/ingestion/upload/batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * 单文件上传（移动端上传队列专用）。
   * 每个文件独立请求，配合队列可实现逐文件进度、失败重试与相册关联。
   */
  uploadSingleAsset: async (
    file: File,
    options?: {
      album?: AlbumTarget;
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<UploadSingleAssetResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    appendAlbumTarget(formData, options?.album);

    const response = await apiClient.post<UploadSingleAssetResponse>(
      '/ingestion/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: SINGLE_UPLOAD_TIMEOUT_MS,
        signal: options?.signal,
        onUploadProgress: (event) => {
          if (!options?.onProgress || !event.total) return;
          options.onProgress(Math.round((event.loaded / event.total) * 100));
        },
      }
    );
    return response.data;
  },
};
