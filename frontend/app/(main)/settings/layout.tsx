'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';

const TABS = [
  { href: '/settings/tags', label: '标签' },
  { href: '/settings/templates', label: '模板' },
  { href: '/settings/tasks', label: '任务' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PageShell>
      <PageHeader
        title="设置"
        description="配置标签、详情/筛选模板，以及导入后处理开关。"
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 h-10 inline-flex items-center rounded-full text-sm border transition-colors',
                active
                  ? 'bg-primary/15 text-primary border-primary/30'
                  : 'bg-white/5 text-foreground-secondary border-white/10 hover:bg-white/10'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </PageShell>
  );
}
