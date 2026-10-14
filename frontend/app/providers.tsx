'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ReactNode, useState } from 'react';
import { Toaster } from 'sonner';

// React Query 默认最多重试 3 次
const MAX_RETRIES = 3;

/**
 * 超时不重试：后端同步接口跑在线程池里，前端超时取消不了后端的计算，
 * 重试只会把同样的慢请求再堆几份（语义搜索卡住时曾因此堆出 5 个满载线程）
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error) && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 默认不缓存"新鲜期"：返回页面时优先拉取最新数据
            staleTime: 0,
            gcTime: 10 * 60 * 1000,
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            retry: shouldRetry,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-center"
        richColors
        duration={3000}
      />
    </QueryClientProvider>
  );
}
