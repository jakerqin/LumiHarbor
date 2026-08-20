'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { gsap } from 'gsap';
import { TimelineNote } from '@/lib/api/types';

interface TimelineEventProps {
  note: TimelineNote;
  index: number;
}

/** 仅渲染笔记卡片；日期与轴线节点由 Timeline 统一排布 */
export function TimelineEvent({ note, index }: TimelineEventProps) {
  const router = useRouter();
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!noteRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.fromTo(
            entry.target,
            { opacity: 0, x: -50 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              delay: index * 0.1,
              ease: 'power2.out',
            }
          );
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(noteRef.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div ref={noteRef} className="mb-16" style={{ opacity: 0 }}>
      <div
        onClick={() => router.push(`/notes/${note.id}`)}
        className="glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-colors duration-200"
      >
        {note.coverAsset && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={note.coverAsset.thumbnailUrl}
              alt={note.title}
              fill
              className="object-cover motion-hover-scale-110 [transition:transform_200ms_cubic-bezier(0.23,1,0.32,1)]"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-heading text-xl font-semibold text-white mb-1">
                {note.title}
              </h3>
            </div>
          </div>
        )}

        {!note.coverAsset && (
          <div className="p-4">
            <h3 className="font-heading text-xl font-semibold">{note.title}</h3>
          </div>
        )}
      </div>
    </div>
  );
}
