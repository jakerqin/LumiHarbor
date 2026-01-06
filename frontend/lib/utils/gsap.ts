/**
 * GSAP 常用工具函数
 * 用于替代 Framer Motion 的常见动画模式
 */

import { gsap } from 'gsap';

/**
 * Hover 缩放动画配置
 */
export const hoverScale = {
  scale: 1.05,
  duration: 0.3,
  ease: 'power2.out',
};

/**
 * Tap 缩放动画配置
 */
export const tapScale = {
  scale: 0.95,
  duration: 0.1,
  ease: 'power2.out',
};

/**
 * 淡入动画配置
 */
export const fadeIn = {
  from: {
    opacity: 0,
    y: 20,
  },
  to: {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: 'power2.out',
  },
};

/**
 * 淡出动画配置
 */
export const fadeOut = {
  opacity: 0,
  y: -20,
  duration: 0.3,
  ease: 'power2.in',
};

/**
 * 交错动画配置
 */
export const staggerConfig = {
  amount: 0.3,
  from: 'start' as const,
};

/**
 * 创建 Hover 事件处理器（Scale 缩放）
 */
export const createHoverHandlers = (element: HTMLElement | null, scale = 1.05) => {
  if (!element) return { onMouseEnter: () => {}, onMouseLeave: () => {} };

  return {
    onMouseEnter: () => {
      gsap.to(element, {
        scale,
        duration: 0.3,
        ease: 'power2.out',
      });
    },
    onMouseLeave: () => {
      gsap.to(element, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    },
  };
};

/**
 * 创建 Hover 事件处理器（Y 轴移动）
 */
export const createHoverLiftHandlers = (element: HTMLElement | null, liftAmount = -4) => {
  if (!element) return { onMouseEnter: () => {}, onMouseLeave: () => {} };

  return {
    onMouseEnter: () => {
      gsap.to(element, {
        y: liftAmount,
        duration: 0.3,
        ease: 'power2.out',
      });
    },
    onMouseLeave: () => {
      gsap.to(element, {
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    },
  };
};

/**
 * 创建 Tap 事件处理器（Scale 缩放）
 */
export const createTapHandlers = (element: HTMLElement | null, scale = 0.95) => {
  if (!element) return { onMouseDown: () => {}, onMouseUp: () => {} };

  return {
    onMouseDown: () => {
      gsap.to(element, {
        scale,
        duration: 0.1,
        ease: 'power2.out',
      });
    },
    onMouseUp: () => {
      gsap.to(element, {
        scale: 1,
        duration: 0.1,
        ease: 'power2.out',
      });
    },
  };
};
