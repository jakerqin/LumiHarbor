import { apiClient } from './client';

const CURRENT_USER_ID = 1;

export type AiJobStatus = 'pending' | 'running' | 'success' | 'failed';
export type AiTier = 'standard' | 'hq';
export type AiGenerateSize = 'square' | 'landscape' | 'portrait';

export interface AiPreset {
  code: string;
  name: string;
  description: string;
  /** 需要补充描述（如要去掉什么） */
  needs_input: boolean;
  /** 推荐精细档 */
  hq: boolean;
}

export interface AiImageStatus {
  /** 总开关打开且已配置 OPENAI_API_KEY */
  enabled: boolean;
  switch_on: boolean;
  configured: boolean;
  model: string;
  edit: AiPreset[];
  generate: AiPreset[];
  sizes: AiGenerateSize[];
}

export interface AiImageJob {
  id: number;
  job_type: 'edit' | 'generate';
  asset_id: number | null;
  preset_code: string | null;
  prompt: string | null;
  model: string;
  quality: string;
  size: string | null;
  status: AiJobStatus;
  error_message: string | null;
  result_version_id: number | null;
  result_asset_id: number | null;
  created_at: string | null;
}

export interface AiJobCreate {
  job_type: 'edit' | 'generate';
  asset_id?: number;
  preset_code?: string;
  prompt?: string;
  tier?: AiTier;
  size?: AiGenerateSize;
  reference_asset_ids?: number[];
}

export interface AssetVersion {
  /** 0 表示还没修过图时的虚拟「原图」 */
  id: number;
  kind: 'original' | 'ai_edit';
  job_id: number | null;
  thumbnail_url: string | null;
  image_url: string | null;
  width: number | null;
  height: number | null;
  is_current: boolean;
  created_at: string | null;
}

export interface AssetVersionsResponse {
  current_version_id: number | null;
  versions: AssetVersion[];
}

/** 调模型通常 30 秒到数分钟，前端轮询任务状态 */
export const AI_JOB_POLL_MS = 3000;

export function isJobDone(job?: AiImageJob | null): boolean {
  return job?.status === 'success' || job?.status === 'failed';
}

export const aiImageApi = {
  getStatus: async (): Promise<AiImageStatus> => {
    const response = await apiClient.get<AiImageStatus>('/ai-image/status');
    return response.data;
  },

  createJob: async (payload: AiJobCreate): Promise<AiImageJob> => {
    const response = await apiClient.post<AiImageJob>('/ai-image/jobs', payload, {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  getJob: async (jobId: number): Promise<AiImageJob> => {
    const response = await apiClient.get<AiImageJob>(`/ai-image/jobs/${jobId}`);
    return response.data;
  },

  getVersions: async (assetId: number): Promise<AssetVersionsResponse> => {
    const response = await apiClient.get<AssetVersionsResponse>(`/assets/${assetId}/versions`);
    return response.data;
  },

  /** versionId 为空表示切回原图 */
  setCurrentVersion: async (assetId: number, versionId: number | null): Promise<void> => {
    await apiClient.put(`/assets/${assetId}/current-version`, { version_id: versionId });
  },

  deleteVersion: async (assetId: number, versionId: number): Promise<void> => {
    await apiClient.delete(`/assets/${assetId}/versions/${versionId}`);
  },
};
