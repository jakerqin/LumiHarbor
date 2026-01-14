'use client';

import { useCallback, useMemo, useRef } from 'react';
import type { MouseEventHandler, RefObject } from 'react';
import { gsap } from 'gsap';
import { hoverScale, tapScale } from '@/lib/utils/gsap';

export type PressableScaleHandlers<T extends HTMLElement> = {
  onMouseEnter: MouseEventHandler<T>;
  onMouseLeave: MouseEventHandler<T>;
  onMouseDown: MouseEventHandler<T>;
  onMouseUp: MouseEventHandler<T>;
};

export type UseGsapPressableScaleOptions = {
  hoverScale?: number;
  hoverDuration?: number;
  hoverEase?: string;
  pressScale?: number;
  pressDuration?: number;
  pressEase?: string;
};

/**
 * 按钮 Hover / Press 缩放动效（GSAP）
 *
 * 设计目标：
 * - 不在 render 阶段读取 ref.current（兼容 react-hooks/refs）
 * - 通过 Hook 复用交互动效，避免页面内重复 handler 代码
 */
export function useGsapPressableScale<T extends HTMLElement>(
  ref: RefObject<T | null>,
  options: UseGsapPressableScaleOptions = {}
): PressableScaleHandlers<T> {
  const {
    hoverScale: hoverScaleValue = hoverScale.scale,
    hoverDuration = hoverScale.duration,
    hoverEase = hoverScale.ease,
    pressScale = tapScale.scale,
    pressDuration = tapScale.duration,
    pressEase = tapScale.ease,
  } = options;

  const isHoveringRef = useRef(false);

  const tweenTo = useCallback(
    (vars: gsap.TweenVars) => {
      const element = ref.current;
      if (!element) return;
      gsap.to(element, { ...vars, overwrite: 'auto' });
    },
    [ref]
  );

  const onMouseEnter = useCallback(() => {
    isHoveringRef.current = true;
    tweenTo({ scale: hoverScaleValue, duration: hoverDuration, ease: hoverEase });
  }, [hoverDuration, hoverEase, hoverScaleValue, tweenTo]);

  const onMouseLeave = useCallback(() => {
    isHoveringRef.current = false;
    tweenTo({ scale: 1, duration: hoverDuration, ease: hoverEase });
  }, [hoverDuration, hoverEase, tweenTo]);

  const onMouseDown = useCallback(() => {
    tweenTo({ scale: pressScale, duration: pressDuration, ease: pressEase });
  }, [pressDuration, pressEase, pressScale, tweenTo]);

  const onMouseUp = useCallback(() => {
    tweenTo({
      scale: isHoveringRef.current ? hoverScaleValue : 1,
      duration: pressDuration,
      ease: pressEase,
    });
  }, [hoverScaleValue, pressDuration, pressEase, tweenTo]);

  return useMemo(
    () => ({ onMouseEnter, onMouseLeave, onMouseDown, onMouseUp }),
    [onMouseDown, onMouseEnter, onMouseLeave, onMouseUp]
  );
}

