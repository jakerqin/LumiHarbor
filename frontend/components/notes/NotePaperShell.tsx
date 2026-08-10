import type { ReactNode } from 'react';

interface NotePaperShellProps {
  children: ReactNode;
  className?: string;
}

/** 笔记深色编辑面：黑底白字，与全站壳一致 */
export function NotePaperShell({ children, className = '' }: NotePaperShellProps) {
  return (
    <div
      data-note-editor-surface
      className={[
        'overflow-hidden rounded-2xl border border-white/[0.06]',
        'bg-[#141210] text-white',
        'shadow-[0_24px_48px_-28px_rgba(0,0,0,0.65)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
