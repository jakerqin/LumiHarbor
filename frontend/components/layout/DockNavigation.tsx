'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils/cn';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { MAIN_NAV, isNavActive, type NavItem } from './navItems';

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const TOOLTIP_MS = 0.15;
const TOOLTIP_FOLLOWUP_MS = 0;
const HOVER_SCALE = 1.02;
const HOVER_DURATION = 0.16;
const PRESS_SCALE = 0.97;
const PRESS_DURATION = 0.16;
const DOCK_SLIDE = 0.25;

/** 桌面右侧边缘唤出 Dock；移动端隐藏（见 MobileBottomNav） */
export function DockNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const lastTooltipAt = useRef(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!navRef.current) return;
    if (reducedMotion) {
      gsap.set(navRef.current, { x: isVisible ? '0%' : '100%' });
      return;
    }
    gsap.to(navRef.current, {
      x: isVisible ? '0%' : '100%',
      duration: DOCK_SLIDE,
      ease: EASE_OUT,
      overwrite: 'auto',
    });
  }, [isVisible, reducedMotion]);

  useEffect(() => {
    const TRIGGER_EXPAND = 100;
    const SHOW_DISTANCE = 40;
    const HIDE_DISTANCE = 100;

    const handleMouseMove = (e: MouseEvent) => {
      const distanceFromRight = window.innerWidth - e.clientX;

      setIsVisible((prevVisible) => {
        if (distanceFromRight > HIDE_DISTANCE) return false;

        if (indicatorRef.current && distanceFromRight <= SHOW_DISTANCE) {
          const indicatorRect = indicatorRef.current.getBoundingClientRect();
          const indicatorCenterY = indicatorRect.top + indicatorRect.height / 2;
          const inZone =
            e.clientY >= indicatorCenterY - TRIGGER_EXPAND &&
            e.clientY <= indicatorCenterY + TRIGGER_EXPAND;
          if (inZone) return true;
        }

        return prevVisible;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    tooltipRefs.current.forEach((tooltip, index) => {
      if (!tooltip) return;
      if (hoveredIndex === index) {
        const now = performance.now();
        const duration =
          now - lastTooltipAt.current < 400 ? TOOLTIP_FOLLOWUP_MS : TOOLTIP_MS;
        lastTooltipAt.current = now;
        gsap.to(tooltip, { opacity: 1, x: 0, duration, ease: EASE_OUT, overwrite: 'auto' });
        return;
      }
      gsap.to(tooltip, {
        opacity: 0,
        x: 10,
        duration: TOOLTIP_MS,
        ease: EASE_OUT,
        overwrite: 'auto',
      });
    });
  }, [hoveredIndex]);

  const handleClick = (item: NavItem) => {
    router.push(item.href);
  };

  const animateButton = (index: number, vars: gsap.TweenVars) => {
    const button = buttonRefs.current[index];
    if (button) gsap.to(button, vars);
  };

  useEffect(() => {
    if (!indicatorRef.current) return;
    const idx = MAIN_NAV.findIndex((item) => isNavActive(item.href, pathname));
    if (idx === -1) return;
    const activeButton = buttonRefs.current[idx];
    if (!activeButton) return;
    const buttonRect = activeButton.getBoundingClientRect();
    const y = buttonRect.top + buttonRect.height / 2 - 12;
    if (reducedMotion) {
      gsap.set(indicatorRef.current, { y });
      return;
    }
    gsap.to(indicatorRef.current, {
      y,
      duration: 0.2,
      ease: EASE_OUT,
      overwrite: 'auto',
    });
  }, [pathname, reducedMotion]);

  return (
    <div className="hidden md:block">
      <div
        ref={indicatorRef}
        className={cn(
          'fixed right-0 top-0 w-1 h-6 bg-primary rounded-l-full shadow-[0_0_12px_rgba(212,180,131,0.35)]',
          'z-40'
        )}
        style={{
          display: MAIN_NAV.some((item) => isNavActive(item.href, pathname)) ? 'block' : 'none',
        }}
      />

      <nav
        ref={navRef}
        className="fixed right-0 top-0 h-screen flex items-center z-50"
        style={{ transform: 'translateX(100%)' }}
      >
        <div className="relative w-20 py-6 px-4 bg-black/40 backdrop-blur-2xl border-l border-white/10 rounded-l-3xl shadow-[-8px_0_32px_rgba(0,0,0,0.3)]">
          <div className="space-y-3">
            {MAIN_NAV.map((item, index) => {
              const Icon = item.icon;
              const isActive = isNavActive(item.href, pathname);
              return (
                <div key={item.href} className="relative">
                  <button
                    ref={(el) => {
                      buttonRefs.current[index] = el;
                    }}
                    type="button"
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-[0_8px_24px_rgba(212,180,131,0.25)]'
                        : 'hover:bg-white/10'
                    )}
                    onClick={() => handleClick(item)}
                    onMouseEnter={() => {
                      animateButton(index, {
                        x: -8,
                        scale: HOVER_SCALE,
                        duration: HOVER_DURATION,
                        ease: EASE_OUT,
                        overwrite: 'auto',
                      });
                      setHoveredIndex(index);
                    }}
                    onMouseLeave={() => {
                      animateButton(index, {
                        x: 0,
                        scale: 1,
                        duration: HOVER_DURATION,
                        ease: EASE_OUT,
                        overwrite: 'auto',
                      });
                      setHoveredIndex(null);
                    }}
                    onMouseDown={() =>
                      animateButton(index, {
                        scale: PRESS_SCALE,
                        duration: PRESS_DURATION,
                        ease: EASE_OUT,
                        overwrite: 'auto',
                      })
                    }
                    onMouseUp={() =>
                      animateButton(index, {
                        scale: HOVER_SCALE,
                        duration: PRESS_DURATION,
                        ease: EASE_OUT,
                        overwrite: 'auto',
                      })
                    }
                  >
                    <Icon
                      size={28}
                      className={cn(
                        'transition-colors',
                        isActive ? 'text-primary-foreground' : 'text-foreground/70'
                      )}
                    />
                  </button>

                  <div
                    ref={(el) => {
                      tooltipRefs.current[index] = el;
                    }}
                    className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 backdrop-blur-sm text-white text-sm rounded-lg whitespace-nowrap shadow-lg border border-white/10 pointer-events-none"
                    style={{ opacity: 0 }}
                  >
                    {item.label}
                    <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white/10 rounded">
                      ⌘{item.shortcut}
                    </kbd>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
