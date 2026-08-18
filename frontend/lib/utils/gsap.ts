/**
 * GSAP 常用动画预设
 */
export const hoverScale = {
  scale: 1.05,
  duration: 0.3,
  ease: 'power2.out',
};

export const tapScale = {
  scale: 0.95,
  duration: 0.1,
  ease: 'power2.out',
};

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
