import { apiClient } from './client';
import type { Asset } from './types';

export interface Note {
  id: number;
  created_by: number;
  title: string | null;
  excerpt: string;
  cover_asset_id: number | null;
  cover_thumbnail_path: string | null;
  cover_thumbnail_url: string | null;
  shot_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotesResponse {
  notes: Note[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface NoteDetail extends Note {
  content: string;
  related_assets: number[];
  assets?: Asset[] | null;
  // 详情页专用：高清封面（原图或预览图）
  cover_original_path: string | null;
  cover_original_url: string | null;
  cover_preview_path: string | null;
  cover_preview_url: string | null;
}

interface BackendNotesPageResponse {
  notes: Note[];
  total: number;
  skip: number;
  limit: number;
  has_more: boolean;
}

export const notesApi = {
  // 获取笔记列表
  getNotes: async (page: number = 1, pageSize: number = 20): Promise<NotesResponse> => {
    const skip = (page - 1) * pageSize;
    const response = await apiClient.get<BackendNotesPageResponse>('/notes', {
      params: {
        skip,
        limit: pageSize,
        sort_by: 'updated_at',
        order: 'desc',
      },
    });

    return {
      notes: response.data.notes,
      total: response.data.total,
      page,
      pageSize,
      hasMore: response.data.has_more,
    };
  },

  // 获取笔记详情
  getNote: async (id: number, options?: { includeAssets?: boolean }): Promise<NoteDetail> => {
    const response = await apiClient.get<NoteDetail>(`/notes/${id}`, {
      params: { include_assets: options?.includeAssets ?? true },
    });
    return response.data;
  },

  // 创建笔记
  createNote: async (payload: {
    title?: string | null;
    content: string;
    cover_asset_id?: number | null;
    shot_at?: string | null;
  }): Promise<NoteDetail> => {
    const response = await apiClient.post<NoteDetail>('/notes', payload);
    return response.data;
  },

  // 更新笔记
  updateNote: async (
    id: number,
    payload: {
      title?: string | null;
      content?: string;
      cover_asset_id?: number | null;
      shot_at?: string | null;
    }
  ): Promise<NoteDetail> => {
    const response = await apiClient.patch<NoteDetail>(`/notes/${id}`, payload);
    return response.data;
  },

  // 删除笔记（软删除）
  deleteNote: async (id: number): Promise<{ deleted: boolean }> => {
    const response = await apiClient.delete<{ deleted: boolean }>(`/notes/${id}`);
    return response.data;
  },
};
