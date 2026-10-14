import { apiClient } from './client';

const CURRENT_USER_ID = 1;

export type FaceSubjectType = 'human' | 'animal';

export interface Face {
  id: number;
  asset_id: number;
  subject_id: number | null;
  subject_name: string | null;
  subject_type: FaceSubjectType;
  species: string | null;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  det_score: number | null;
  quality_score: number | null;
  embedding_model: string;
  crop_path: string | null;
  crop_url: string | null;
  created_at: string | null;
}

export interface FacesResponse {
  faces: Face[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export const facesApi = {
  getAssetFaces: async (assetId: number): Promise<Face[]> => {
    const response = await apiClient.get<Face[]>(`/assets/${assetId}/faces`);
    return response.data;
  },

  getFaces: async (
    page: number = 1,
    pageSize: number = 30,
    subjectType?: FaceSubjectType,
    subjectId?: number
  ): Promise<FacesResponse> => {
    const response = await apiClient.get<FacesResponse>('/faces', {
      params: {
        page,
        page_size: pageSize,
        user_id: CURRENT_USER_ID,
        subject_type: subjectType,
        subject_id: subjectId,
      },
      });
    return response.data;
  },

  backfill: async (payload: {
    missing_only?: boolean;
    limit?: number;
    shot_at_from?: string;
    shot_at_to?: string;
  }): Promise<{ queued: number; message: string }> => {
    const response = await apiClient.post<{ queued: number; message: string }>(
      '/management/faces/backfill',
      payload,
      { timeout: 120000 }
    );
    return response.data;
  },
};
