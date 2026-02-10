'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NoteEditorNavbarProps {
  onBack?: () => void;
}

export function NoteEditorNavbar({
  onBack,
}: NoteEditorNavbarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className="fixed top-0 left-0 z-50 px-8 py-6 pointer-events-none">
      {/* 返回按钮（毛玻璃样式） */}
      <button
        onClick={handleBack}
        className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-colors cursor-pointer shadow-lg"
      >
        <ArrowLeft size={20} />
        <span className="text-sm font-medium">返回</span>
      </button>
    </div>
  );
}
