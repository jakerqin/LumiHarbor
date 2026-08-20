/**
 * GSAP 常用动画预设（时长/曲线与 globals.css token 对齐）
 */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export const hoverScale = {
  scale: 1.02,
  duration: 0.16,
  ease: EASE_OUT,
};

export const tapScale = {
  scale: 0.97,
  duration: 0.16,
  ease: EASE_OUT,
};

export const fadeIn = {
  from: { opacity: 0, y: 12 },
  to: { opacity: 1, y: 0, duration: 0.2, ease: EASE_OUT },
};
