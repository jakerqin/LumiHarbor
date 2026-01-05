'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, MapPin, Calendar } from '@phosphor-icons/react';
import { Asset } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

interface BentoCardProps {
  asset: Asset;
  size: 'small' | 'medium' | 'large';
  index: number;
}

export function BentoCard({ asset, size, index }: BentoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    small: 'col-span-1 row-span-1 h-64',
    medium: 'col-span-1 row-span-2 h-[520px]',
    large: 'col-span-2 row-span-2 h-[520px]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cn(
        'relative overflow-hidden rounded-2xl cursor-pointer group',
        sizeClasses[size]
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.fileName}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          unoptimized
        />

        {asset.type === 'video' && (
          <div className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <Play size={20} weight="fill" className="text-white" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
        >
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
            {asset.location && (
              <div className="flex items-center gap-2 text-white/90">
                <MapPin size={16} weight="fill" />
                <span className="text-sm font-medium">{asset.location.name}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-white/70">
              <Calendar size={16} />
              <span className="text-sm">
                {new Date(asset.shotAt).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>

            {asset.tags && asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {asset.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-white/20 backdrop-blur-sm rounded-full text-white"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
