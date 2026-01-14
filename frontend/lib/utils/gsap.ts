/**
 * GSAP 常用工具函数
 * 用于替代 Framer Motion 的常见动画模式
 */

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
