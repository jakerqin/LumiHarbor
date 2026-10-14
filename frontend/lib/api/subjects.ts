import { apiClient } from './client';

const CURRENT_USER_ID = 1;
const SLOW = { timeout: 120000 };

export type SubjectKind = 'human' | 'pet';
export type PetSpecies = 'cat' | 'dog';

export interface Subject {
  id: number;
  name: string;
  kind: SubjectKind;
  species: string | null;
  cover_path: string | null;
  cover_url: string | null;
  face_count: number;
  created_at: string | null;
}

export interface SubjectsResponse {
  subjects: Subject[];
  total: number;
}

export interface FaceCandidate {
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  subject_type: 'human' | 'animal';
  species: string | null;
  det_score: number;
}

export const subjectsApi = {
  list: async (): Promise<SubjectsResponse> => {
    const response = await apiClient.get<SubjectsResponse>('/subjects', {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  get: async (id: number): Promise<Subject> => {
    const response = await apiClient.get<Subject>(`/subjects/${id}`, {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  create: async (payload: { name: string; kind: SubjectKind; species?: PetSpecies }): Promise<Subject> => {
    const response = await apiClient.post<Subject>('/subjects', payload, {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  update: async (id: number, name: string): Promise<Subject> => {
    const response = await apiClient.patch<Subject>(`/subjects/${id}`, { name }, {
      params: { user_id: CURRENT_USER_ID },
    });
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/subjects/${id}`, { params: { user_id: CURRENT_USER_ID } });
  },

  uploadRef: async (
    id: number,
    file: File,
    bbox?: { bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number }
  ): Promise<Subject> => {
    const form = new FormData();
    form.append('file', file);
    if (bbox) {
      form.append('bbox_x', String(bbox.bbox_x));
      form.append('bbox_y', String(bbox.bbox_y));
      form.append('bbox_w', String(bbox.bbox_w));
      form.append('bbox_h', String(bbox.bbox_h));
    }
    const response = await apiClient.post<Subject>(`/subjects/${id}/refs`, form, {
      params: { user_id: CURRENT_USER_ID },
      ...SLOW,
    });
    return response.data;
  },

  detectUpload: async (file: File): Promise<FaceCandidate[]> => {
    const form = new FormData();
    form.append('file', file);
    const response = await apiClient.post<FaceCandidate[]>('/subjects/face-candidates', form, SLOW);
    return response.data;
  },
};
