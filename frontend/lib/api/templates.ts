import { apiClient } from './client';

export interface TemplateField {
  id: number;
  template_id: number;
  field_source: 'tag' | 'asset' | 'relation';
  field_key: string;
  sort_order: number;
  is_required: boolean;
  is_readonly: boolean;
  widget_override: number | null;
  extra_info: Record<string, unknown> | null;
  tag_name?: string | null;
  input_type?: number | null;
  tag_source?: string | null;
  tag_extra_info?: Record<string, unknown> | null;
}

export interface Template {
  id: number;
  code: string;
  name: string;
  kind: 'ingest' | 'detail' | 'filter' | 'card';
  asset_type: string | null;
  is_default: boolean;
  extra_info: Record<string, unknown> | null;
  fields?: TemplateField[];
}

export interface TemplateResolve {
  template: Template | null;
  fields: TemplateField[];
  registry: {
    asset_fields: Record<string, { label: string; input_type: number }>;
    relation_fields: Record<string, { label: string; input_type: number }>;
  };
}

export const templatesApi = {
  list: async (kind?: string): Promise<Template[]> => {
    const response = await apiClient.get<Template[]>('/templates', {
      params: kind ? { kind } : undefined,
    });
    return response.data;
  },

  resolve: async (kind: string, assetType?: string | null): Promise<TemplateResolve> => {
    const response = await apiClient.get<TemplateResolve>('/templates/resolve', {
      params: { kind, asset_type: assetType || undefined },
    });
    return response.data;
  },

  create: async (payload: Partial<Template>): Promise<Template> => {
    const response = await apiClient.post<Template>('/templates', payload);
    return response.data;
  },

  update: async (id: number, payload: Partial<Template>): Promise<Template> => {
    const response = await apiClient.patch<Template>(`/templates/${id}`, payload);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/templates/${id}`);
  },

  listFields: async (templateId: number): Promise<TemplateField[]> => {
    const response = await apiClient.get<TemplateField[]>(`/templates/${templateId}/fields`);
    return response.data;
  },

  addField: async (templateId: number, payload: Partial<TemplateField>): Promise<TemplateField> => {
    const response = await apiClient.post<TemplateField>(`/templates/${templateId}/fields`, payload);
    return response.data;
  },

  updateField: async (fieldId: number, payload: Partial<TemplateField>): Promise<TemplateField> => {
    const response = await apiClient.patch<TemplateField>(`/templates/fields/${fieldId}`, payload);
    return response.data;
  },

  deleteField: async (fieldId: number): Promise<void> => {
    await apiClient.delete(`/templates/fields/${fieldId}`);
  },
};
