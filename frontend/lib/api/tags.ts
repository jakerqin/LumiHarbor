import { apiClient } from './client';

export interface TagDefinition {
  tag_key: string;
  tag_name: string;
  input_type: number | null;
  extra_info: Record<string, unknown> | null;
  description: string | null;
}

export const tagsApi = {
  /**
   * 获取标签元数据定义（全量）
   * - 用于前端将 tag_key 映射为可读的 tag_name
   * - 同时可用于动态表单渲染（input_type/extra_info）
   */
  getTagDefinitions: async (): Promise<TagDefinition[]> => {
    const response = await apiClient.get<TagDefinition[]>('/tags/definitions');
    return response.data;
  },
};

