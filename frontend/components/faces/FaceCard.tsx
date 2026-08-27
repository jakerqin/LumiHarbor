'use client';

import type { Face } from '@/lib/api/faces';
import { faceLabel } from '@/lib/utils/faceLabel';

interface FaceCardProps {
  face: Face;
  onClick: () => void;
}

export function FaceCard({ face, onClick }: FaceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-background-secondary border border-white/10 hover:border-white/20 hover:shadow-[0_18px_48px_rgba(0,0,0,0.35)] transition-[border-color,box-shadow] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={`查看素材 #${face.asset_id}，${faceLabel(face)}`}
    >
      {face.crop_url ? (
        <img
          src={face.crop_url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-background-tertiary" />
      )}
    </button>
  );
}
