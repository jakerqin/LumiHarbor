'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import { MapPin, Image as ImageIcon, Video } from 'lucide-react';
import { Event } from '@/lib/api/types';

interface TimelineEventProps {
  event: Event;
  index: number;
}

export function TimelineEvent({ event, index }: TimelineEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inView, setInView] = useState(false);
  const eventRef = useRef<HTMLDivElement>(null);
  const expandableRef = useRef<HTMLDivElement>(null);

  // 滚动触发动画 (IntersectionObserver)
  useEffect(() => {
    if (!eventRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(eventRef.current);
    return () => observer.disconnect();
  }, []);

  // 进入动画
  useEffect(() => {
    if (!inView || !eventRef.current) return;

    gsap.fromTo(
      eventRef.current,
      { opacity: 0, x: -50 },
      {
        opacity: 1,
        x: 0,
        duration: 0.5,
        delay: index * 0.1,
        ease: 'power2.out',
      }
    );
  }, [inView, index]);

  // 展开/收起动画
  useEffect(() => {
    if (!expandableRef.current) return;

    if (isExpanded) {
      expandableRef.current.style.display = 'block';
      gsap.fromTo(
        expandableRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' }
      );
    } else {
      gsap.to(expandableRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          if (expandableRef.current) {
            expandableRef.current.style.display = 'none';
          }
        },
      });
    }
  }, [isExpanded]);

  return (
    <div
      ref={eventRef}
      className="relative ml-44 mb-16"
      style={{ opacity: 0 }}
    >
      <div className="absolute -left-32 top-2 text-right">
        <span className="font-heading text-lg font-semibold text-white/60">
          {new Date(event.startDate).toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
      </div>

      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
      >
        <div className="relative h-48 overflow-hidden">
          <Image
            src={event.coverAsset.thumbnailUrl}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-110"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-heading text-xl font-semibold text-white mb-1">
              {event.title}
            </h3>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-sm text-foreground-secondary line-clamp-2">
            {event.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-foreground-tertiary">
            <div className="flex items-center gap-1">
              <ImageIcon size={16} />
              <span>{event.relatedAssets.photoCount} 张照片</span>
            </div>
            <div className="flex items-center gap-1">
              <Video size={16} />
              <span>{event.relatedAssets.videoCount} 个视频</span>
            </div>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-sm text-foreground-tertiary">
              <MapPin size={16} />
              <span>{event.location.name}</span>
            </div>
          )}
        </div>

        <div
          ref={expandableRef}
          className="border-t border-white/10 overflow-hidden"
          style={{ display: 'none', height: 0 }}
        >
          <div className="p-4">
            <p className="text-sm text-foreground-secondary">
              点击查看完整内容...（待实现）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
