import { apiClient } from './client';

export interface TagDefinition {
  id?: number;
  tag_key: string;
  tag_name: string;
  input_type: number | null;
  extra_info: Record<string, unknown> | null;
  description: string | null;
  source?: 'system' | 'user';
}

export interface TagMapping {
  id: number;
  tag_key: string;
  source_key: string;
  asset_type: string | null;
  transform: string;
  priority: number;
}

export const tagsApi = {
  getTagDefinitions: async (): Promise<TagDefinition[]> => {
    const response = await apiClient.get<TagDefinition[]>('/tags/definitions');
    return response.data;
  },

  createDefinition: async (payload: Partial<TagDefinition>): Promise<TagDefinition> => {
    const response = await apiClient.post<TagDefinition>('/tags/definitions', payload);
    return response.data;
  },

  updateDefinition: async (id: number, payload: Partial<TagDefinition>): Promise<TagDefinition> => {
    const response = await apiClient.patch<TagDefinition>(`/tags/definitions/${id}`, payload);
    return response.data;
  },

  deleteDefinition: async (id: number): Promise<void> => {
    await apiClient.delete(`/tags/definitions/${id}`);
  },

  getMappings: async (tagKey?: string): Promise<TagMapping[]> => {
    const response = await apiClient.get<TagMapping[]>('/tags/mappings', {
      params: tagKey ? { tag_key: tagKey } : undefined,
    });
    return response.data;
  },

  createMapping: async (payload: Omit<TagMapping, 'id'>): Promise<TagMapping> => {
    const response = await apiClient.post<TagMapping>('/tags/mappings', payload);
    return response.data;
  },

  deleteMapping: async (id: number): Promise<void> => {
    await apiClient.delete(`/tags/mappings/${id}`);
  },
};
