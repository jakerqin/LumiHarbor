import { useEffect, useCallback, useRef } from 'react';

/**
 * 无限滚动 Hook
 *
 * @param callback - 触发加载的回调函数
 * @param hasMore - 是否还有更多数据
 * @param isLoading - 是否正在加载
 * @param threshold - 距离底部多少像素时触发（默认 500px）
 */
export function useInfiniteScroll(
  callback: () => void,
  hasMore: boolean,
  isLoading: boolean,
  threshold: number = 500
) {
  const callbackRef = useRef(callback);

  // 保持 callback 引用最新
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const handleScroll = useCallback(() => {
    // 如果正在加载或没有更多数据，不触发
    if (isLoading || !hasMore) return;

    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // 距离底部小于阈值时触发加载
    if (docHeight - (scrollTop + windowHeight) < threshold) {
      callbackRef.current();
    }
  }, [hasMore, isLoading, threshold]);

  useEffect(() => {
    // 节流处理（300ms）
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 300);
    };

    window.addEventListener('scroll', throttledScroll);

    // 初始检查（页面加载时如果内容不足一屏，自动加载）
    handleScroll();

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll]);
}
