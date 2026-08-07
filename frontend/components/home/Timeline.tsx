'use client';

import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { TimelineEvent } from './TimelineEvent';
import { EmptyState } from '@/components/common/EmptyState';

function formatMonthDay(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

export function Timeline() {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => homeApi.getTimeline(10),
  });

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="h-8 w-40 rounded bg-background-tertiary animate-pulse mb-8" />
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-background-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <EmptyState
        title="大事记还是空的"
        description="写几篇笔记后，首页时间轴会按年份串起你的故事。"
        action={{ label: '去写笔记', href: '/notes/new' }}
      />
    );
  }

  const notesByYear = notes.reduce((acc, note) => {
    const year = new Date(note.createdAt).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(note);
    return acc;
  }, {} as Record<number, typeof notes>);

  const years = Object.keys(notesByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
      <div className="mb-10 max-w-md">
        <h2 className="text-section font-heading mb-2">岁月札记</h2>
        <p className="text-foreground-secondary">把路过的风景，收进文字里</p>
      </div>

      <div className="relative">
        {/* 轴线对齐圆点中心：日期列 4rem + 圆点半宽 0.625rem */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary/50 to-transparent"
          style={{ left: 'calc(4rem + 0.625rem - 1px)' }}
        />

        {years.map((year) => (
          <div key={year} className="mb-12">
            <div className="relative mb-8">
              <h3 className="text-3xl font-heading font-semibold text-primary tabular-nums">
                {year}
              </h3>
            </div>

            <div className="space-y-0">
              {notesByYear[year].map((note, index) => (
                <div
                  key={note.id}
                  className="grid grid-cols-[4rem_2.75rem_minmax(0,1fr)] gap-x-0 items-start"
                >
                  {/* 与圆点同高盒子内垂直居中，避免字体行高把日期顶歪 */}
                  <div className="flex h-5 items-center justify-end pr-4">
                    <span className="font-heading text-base font-semibold text-white/60 tabular-nums leading-none">
                      {formatMonthDay(note.createdAt)}
                    </span>
                  </div>

                  {/* 列宽 = 圆点 + 横线；卡片列紧挨横线末端 */}
                  <div className="relative h-5 w-[2.75rem]">
                    <div className="absolute left-0 top-0 w-5 h-5">
                      <div className="w-full h-full rounded-full bg-primary border-4 border-background shadow-[0_0_0_3px_rgba(212,180,131,0.25)]" />
                    </div>
                    <div className="absolute left-5 top-1/2 w-6 h-0.5 -translate-y-1/2 bg-gradient-to-r from-primary/50 to-transparent" />
                  </div>

                  <TimelineEvent note={note} index={index} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
