'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NoteBackButtonProps {
  onBack?: () => void;
  label?: string;
}

/** 笔记编辑/详情页返回：毛玻璃，浮在深色壳上 */
export function NoteBackButton({ onBack, label = '返回' }: NoteBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  };

  return (
    <div className="fixed top-0 left-0 z-50 px-6 sm:px-8 py-5 pointer-events-none">
      <button
        type="button"
        onClick={handleBack}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-[#e4d4bc]/25 bg-[#1f1c16]/55 px-3.5 py-2 text-sm font-medium text-[#f3eee6] shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:bg-[#1f1c16]/75 active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        <span>{label}</span>
      </button>
    </div>
  );
}
