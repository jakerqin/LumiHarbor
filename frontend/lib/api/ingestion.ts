import { apiClient } from './client';
import type { LocationData } from '@/components/common/MapPicker';

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

/** 多文件逐个上传的汇总 */
export interface UploadTally {
  imported: number;
  skipped: number;
  failed: number;
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

function appendLocationData(formData: FormData, locationData?: LocationData): void {
  if (!locationData) return;
  formData.append('default_gps', `${locationData.longitude},${locationData.latitude}`);
  const locationPoi = locationData.poi || locationData.city || locationData.district;
  if (locationPoi) {
    formData.append('location_poi', locationPoi);
  }
}

export const ingestionApi = {
  /**
   * 单文件上传（移动端上传队列专用）。
   * 每个文件独立请求，配合队列可实现逐文件进度、失败重试与相册关联。
   */
  uploadSingleAsset: async (
    file: File,
    options?: {
      album?: AlbumTarget;
      locationData?: LocationData;
      onProgress?: (percent: number) => void;
      signal?: AbortSignal;
    }
  ): Promise<UploadSingleAssetResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    appendAlbumTarget(formData, options?.album);
    appendLocationData(formData, options?.locationData);

    const response = await apiClient.post<UploadSingleAssetResponse>('/ingestion/upload', formData, {
      timeout: SINGLE_UPLOAD_TIMEOUT_MS,
      signal: options?.signal,
      onUploadProgress: (event) => {
        if (!options?.onProgress || !event.total) return;
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
    return response.data;
  },

  /**
   * 多文件逐个上传：每个文件独立请求（单文件超时），失败不中断后续文件。
   * 首个文件新建相册后，后续文件改用返回的 album_id，避免重复建册。
   */
  uploadFilesSequentially: async (
    files: File[],
    options?: {
      album?: AlbumTarget;
      locationData?: LocationData;
      onFileDone?: (done: number, total: number) => void;
    }
  ): Promise<UploadTally> => {
    let album: AlbumTarget = options?.album ?? { mode: 'none' };
    const tally: UploadTally = { imported: 0, skipped: 0, failed: 0 };
    for (const [index, file] of files.entries()) {
      try {
        const result = await ingestionApi.uploadSingleAsset(file, {
          album,
          locationData: options?.locationData,
        });
        tally.imported += result.imported;
        tally.skipped += result.skipped;
        tally.failed += result.failed;
        if (result.album?.album_id) {
          album = { mode: 'existing', albumId: result.album.album_id };
        }
      } catch {
        tally.failed += 1;
      }
      options?.onFileDone?.(index + 1, files.length);
    }
    return tally;
  },

  /** 本机文件夹导入：首个文件建相册，后续归入同一相册 */
  uploadFolderToNewAlbum: (options: {
    files: File[];
    albumName: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    locationData?: LocationData;
  }): Promise<UploadTally> =>
    ingestionApi.uploadFilesSequentially(options.files, {
      album: {
        mode: 'new',
        name: options.albumName,
        description: options.description,
        startTime: options.startTime,
        endTime: options.endTime,
      },
      locationData: options.locationData,
    }),
};
