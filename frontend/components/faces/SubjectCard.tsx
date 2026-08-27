'use client';

import { Trash2 } from 'lucide-react';
import type { Subject } from '@/lib/api/subjects';

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  onDelete?: (subject: Subject) => void;
}

export function SubjectCard({ subject, onClick, onDelete }: SubjectCardProps) {
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer transition-transform duration-200 hover:-translate-y-1.5"
    >
      <div className="relative mb-4">
        <div className="aspect-square rounded-full overflow-hidden bg-background-secondary">
          {subject.cover_url ? (
            <img
              src={subject.cover_url}
              alt={subject.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-background-tertiary flex items-center justify-center text-3xl text-foreground-tertiary">
              {subject.name.slice(0, 1)}
            </div>
          )}
        </div>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(subject);
            }}
            className="absolute top-0 right-0 p-1.5 bg-black/60 backdrop-blur-sm rounded-full hover:bg-red-500/80 transition-colors"
            aria-label={`删除 ${subject.name}`}
          >
            <Trash2 size={16} className="text-white" />
          </button>
        )}
      </div>

      <h3 className="text-lg font-heading font-semibold text-center group-hover:text-primary transition-colors truncate">
        {subject.name}
      </h3>
      <p className="mt-1 text-center text-xs text-foreground-tertiary tabular-nums">
        {subject.face_count} 张匹配
      </p>
    </div>
  );
}
