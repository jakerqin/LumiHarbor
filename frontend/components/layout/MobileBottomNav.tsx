'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { MAIN_NAV, isNavActive } from './navItems';

/** 触屏常驻底栏；桌面隐藏（桌面用 Dock） */
export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/90 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="主导航"
    >
      <ul className="grid grid-cols-7 h-14">
        {MAIN_NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex h-full flex-col items-center justify-center gap-0.5 text-[10px]',
                  active ? 'text-primary' : 'text-foreground-tertiary'
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
