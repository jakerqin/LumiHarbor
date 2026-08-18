import { useEffect, useMemo, useRef } from 'react';

/** 防抖回调；fn 始终指向最新闭包，返回的函数引用在 wait 不变时稳定 */
export function useDebouncedCallback<Args extends unknown[]>(
  fn: (...args: Args) => unknown,
  wait: number
): (...args: Args) => void {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useMemo(
    () =>
      (...args: Args) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          void fnRef.current(...args);
        }, wait);
      },
    [wait]
  );
}
