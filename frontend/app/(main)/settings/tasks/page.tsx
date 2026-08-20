'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tasksApi } from '@/lib/api/tasks';

export default function SettingsTasksPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['task-definitions'],
    queryFn: () => tasksApi.listDefinitions(),
  });
  const logsQuery = useQuery({
    queryKey: ['task-logs'],
    queryFn: () => tasksApi.listLogs(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ code, enabled }: { code: string; enabled: boolean }) =>
      tasksApi.updateDefinition(code, { is_enabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-definitions'] });
      toast.success('已更新');
    },
    onError: (err: Error) => toast.error(err.message || '更新失败'),
  });

  const batchMutation = useMutation({
    mutationFn: () => tasksApi.triggerBatchPhash(),
    onSuccess: (data) => toast.success(data.message),
    onError: (err: Error) => toast.error(err.message || '补跑失败'),
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-background-secondary divide-y divide-white/5">
        {(query.data ?? []).map((task) => (
          <div key={task.task_code} className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm">{task.name}</p>
              <p className="text-xs text-foreground-tertiary">
                {task.description} · {task.run_mode === 'async' ? '异步' : '同步'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                toggleMutation.mutate({ code: task.task_code, enabled: !task.is_enabled })
              }
              className={`relative h-7 w-12 rounded-full transition-colors ${
                task.is_enabled ? 'bg-primary' : 'bg-white/15'
              }`}
              aria-label={task.is_enabled ? '关闭任务' : '开启任务'}
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                  task.is_enabled ? 'left-5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </section>

      <div>
        <button
          type="button"
          className="h-10 px-4 rounded-full bg-white/10 text-sm"
          onClick={() => batchMutation.mutate()}
        >
          补跑缺失哈希
        </button>
      </div>

      <section>
        <h2 className="text-lg font-heading mb-3">最近日志</h2>
        <div className="rounded-2xl border border-white/10 bg-background-secondary divide-y divide-white/5">
          {(logsQuery.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-sm text-foreground-secondary">暂无日志</p>
          ) : (
            (logsQuery.data ?? []).slice(0, 20).map((log) => (
              <div key={log.id} className="px-4 py-3 text-sm flex justify-between gap-4">
                <span>
                  {log.task_type} · 素材 {log.asset_id}
                </span>
                <span className="text-foreground-tertiary">{log.task_status}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
