'use client';

import Link from 'next/link';
import { ScanFace } from 'lucide-react';
import type { Face } from '@/lib/api/faces';
import { faceLabel } from '@/lib/utils/faceLabel';

interface AssetFacesStripProps {
  faces: Face[];
  isLoading: boolean;
}

/** 详情页已匹配成员条；没有脸时整块不渲染 */
export function AssetFacesStrip({ faces, isLoading }: AssetFacesStripProps) {
  if (!isLoading && faces.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <ScanFace size={18} className="text-foreground-secondary" />
          <h2 className="text-lg font-heading font-semibold">成员</h2>
        </div>
        {!isLoading && (
          <span className="text-xs text-foreground-tertiary">{faces.length} 张</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 w-20 shrink-0 rounded-full bg-background-secondary border border-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {faces.map((face) => {
            const label = faceLabel(face);
            const inner = (
              <>
                <div className="aspect-square rounded-full overflow-hidden bg-background-secondary border border-white/10 group-hover:border-white/20 transition-colors">
                  {face.crop_url ? (
                    <img
                      src={face.crop_url}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full bg-background-tertiary" />
                  )}
                </div>
                <p className="mt-1.5 text-center text-xs text-foreground-tertiary truncate">
                  {label}
                </p>
              </>
            );
            return (
              <li key={face.id} className="w-20 shrink-0">
                {face.subject_id ? (
                  <Link
                    href={`/faces/${face.subject_id}`}
                    className="group block rounded-full hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`查看 ${label} 的匹配照片`}
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
