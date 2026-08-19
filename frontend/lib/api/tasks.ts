import { apiClient } from './client';

export interface TaskDefinition {
  id: number;
  task_code: string;
  name: string;
  description: string | null;
  run_mode: 'sync' | 'async';
  is_enabled: boolean;
  extra_info: Record<string, unknown> | null;
}

export interface TaskLog {
  id: number;
  task_type: string;
  task_status: string;
  asset_id: number;
  retry_count: number | null;
  error_message: string | null;
  executed_at: string | null;
  created_at: string | null;
}

export const tasksApi = {
  listDefinitions: async (): Promise<TaskDefinition[]> => {
    const response = await apiClient.get<TaskDefinition[]>('/tasks/definitions');
    return response.data;
  },

  updateDefinition: async (
    taskCode: string,
    payload: Partial<Pick<TaskDefinition, 'is_enabled' | 'description'>>
  ): Promise<TaskDefinition> => {
    const response = await apiClient.patch<TaskDefinition>(
      `/tasks/definitions/${taskCode}`,
      payload
    );
    return response.data;
  },

  listLogs: async (taskType?: string): Promise<TaskLog[]> => {
    const response = await apiClient.get<TaskLog[]>('/tasks/logs', {
      params: taskType ? { task_type: taskType } : undefined,
    });
    return response.data;
  },

  triggerBatchPhash: async (): Promise<{ queued: number; message: string }> => {
    const response = await apiClient.post<{ queued: number; message: string }>(
      '/tasks/batch-phash',
      { missing_only: true }
    );
    return response.data;
  },
};
