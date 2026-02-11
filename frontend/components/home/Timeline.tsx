'use client';

import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { TimelineEvent } from './TimelineEvent';

export function Timeline() {
  const { data: notes, isLoading } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => homeApi.getTimeline(10),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-foreground-secondary">加载时间轴中...</p>
        </div>
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无笔记记录</p>
        </div>
      </div>
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-heading font-bold mb-2">笔记时间轴</h2>
        <p className="text-foreground-secondary">记录生活中的点点滴滴</p>
      </div>

      <div className="relative">
        <div className="absolute left-24 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-primary/50 to-transparent" />

        {years.map((year) => (
          <div key={year} className="mb-12">
            <div className="relative mb-8">
              <h3 className="text-3xl font-heading font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {year}
              </h3>
            </div>

            <div className="space-y-0">
              {notesByYear[year].map((note, index) => (
                <div key={note.id} className="relative">
                  <div className="absolute left-24 top-4 w-5 h-5 -translate-x-1/2">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 border-4 border-black shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_0_20px_rgba(59,130,246,0.6)] animate-pulse" />
                  </div>

                  <div className="absolute left-24 top-4 w-16 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

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
