import { useQuery } from '@tanstack/react-query';
import { AI_JOB_POLL_MS, aiImageApi, isJobDone } from '@/lib/api/aiImage';

/** AI 修图开关与预设；未开启时页面不显示入口 */
export function useAiImageStatus() {
  return useQuery({
    queryKey: ['ai-image-status'],
    queryFn: aiImageApi.getStatus,
    staleTime: 5 * 60 * 1000,
  });
}

/** 轮询任务直到成功或失败 */
export function useAiJob(jobId: number | null) {
  return useQuery({
    queryKey: ['ai-image-job', jobId],
    queryFn: () => aiImageApi.getJob(jobId as number),
    enabled: jobId !== null,
    refetchInterval: (query) => (isJobDone(query.state.data) ? false : AI_JOB_POLL_MS),
  });
}
