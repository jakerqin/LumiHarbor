'use client';

import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/lib/api/home';
import { TimelineEvent } from './TimelineEvent';

export function Timeline() {
  const { data: events, isLoading } = useQuery({
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

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-xl text-foreground-secondary">暂无大事件记录</p>
        </div>
      </div>
    );
  }

  const eventsByYear = events.reduce((acc, event) => {
    const year = new Date(event.startDate).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(event);
    return acc;
  }, {} as Record<number, typeof events>);

  const years = Object.keys(eventsByYear)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12">
        <h2 className="text-4xl font-heading font-bold mb-2">大事记</h2>
        <p className="text-foreground-secondary">记录生活中的重要时刻</p>
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
              {eventsByYear[year].map((event, index) => (
                <div key={event.id} className="relative">
                  <div className="absolute left-24 top-4 w-5 h-5 -translate-x-1/2">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-purple-600 border-4 border-black shadow-[0_0_0_4px_rgba(59,130,246,0.2),0_0_20px_rgba(59,130,246,0.6)] animate-pulse" />
                  </div>

                  <div className="absolute left-24 top-4 w-16 h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />

                  <TimelineEvent event={event} index={index} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
