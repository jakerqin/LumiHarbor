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

export function TimelineEvent({ note, index }: TimelineEventProps) {
  const router = useRouter();
  const noteRef = useRef<HTMLDivElement>(null);

  // 滚动触发进入动画
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
    <div
      ref={noteRef}
      className="relative ml-44 mb-16"
      style={{ opacity: 0 }}
    >
      <div className="absolute -left-32 top-2 text-right">
        <span className="font-heading text-lg font-semibold text-white/60">
          {new Date(note.createdAt).toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
      </div>

      <div
        onClick={() => router.push(`/notes/${note.id}`)}
        className="glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
      >
        {note.coverAsset && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={note.coverAsset.thumbnailUrl}
              alt={note.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-110"
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
            <h3 className="font-heading text-xl font-semibold">
              {note.title}
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}
