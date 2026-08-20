'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';

type BlurTextProps = {
  text?: string;
  delay?: number;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  stepDuration?: number;
};

export default function BlurText({
  text = '',
  delay = 200,
  className = '',
  animateBy = 'words',
  direction = 'top',
  stepDuration = 0.35,
}: BlurTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const spans = root.querySelectorAll('span');
    if (reducedMotion) {
      gsap.set(spans, { filter: 'blur(0px)', opacity: 1, y: 0 });
      return;
    }
    const fromY = direction === 'top' ? -50 : 50;
    gsap.fromTo(
      spans,
      { filter: 'blur(10px)', opacity: 0, y: fromY },
      {
        filter: 'blur(0px)',
        opacity: 1,
        y: 0,
        duration: stepDuration * 2,
        stagger: delay / 1000,
        ease: 'power2.out',
      }
    );
  }, [delay, direction, reducedMotion, stepDuration, text]);

  return (
    <p ref={ref} className={`blur-text ${className} flex flex-wrap`}>
      {elements.map((segment, index) => (
        <span key={index} className="inline-block will-change-[transform,filter,opacity]">
          {segment === ' ' ? '\u00A0' : segment}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </span>
      ))}
    </p>
  );
}
