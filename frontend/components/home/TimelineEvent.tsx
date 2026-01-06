'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Image as ImageIcon, Video } from 'lucide-react';
import { Event } from '@/lib/api/types';

interface TimelineEventProps {
  event: Event;
  index: number;
}

export function TimelineEvent({ event, index }: TimelineEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative ml-44 mb-16"
    >
      <div className="absolute -left-32 top-2 text-right">
        <span className="font-heading text-lg font-semibold text-white/60">
          {new Date(event.startDate).toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
          })}
        </span>
      </div>

      <motion.div
        layout
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

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/10"
            >
              <div className="p-4">
                <p className="text-sm text-foreground-secondary">
                  点击查看完整内容...（待实现）
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
