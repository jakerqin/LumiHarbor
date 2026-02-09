'use client';

import { ArrowLeft, Check, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NoteEditorNavbarProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
  onBack?: () => void;
  onSave?: () => void;
}

export function NoteEditorNavbar({
  isSaving = false,
  lastSaved = null,
  onBack,
  onSave,
}: NoteEditorNavbarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleSave = () => {
    if (onSave && !isSaving) {
      onSave();
    }
  };

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return '刚刚';
    if (seconds < 60) return `${seconds}秒前`;
    if (minutes < 60) return `${minutes}分钟前`;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative z-50 pointer-events-none">
      <div className="mx-auto max-w-screen-xl px-6 py-6">
        <div className="flex items-center justify-between">
          {/* 左侧：返回按钮（毛玻璃样式） */}
          <button
            onClick={handleBack}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-colors cursor-pointer shadow-lg"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回</span>
          </button>

          {/* 右侧：保存按钮（毛玻璃样式） */}
          <div className="pointer-events-auto flex items-center gap-3">
            {/* 保存状态 */}
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>保存中</span>
                </>
              ) : lastSaved ? (
                <>
                  <Check size={16} className="text-green-400" />
                  <span>{formatLastSaved(lastSaved)}</span>
                </>
              ) : null}
            </div>

            {/* 保存按钮 */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 transition-colors cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span className="text-sm font-medium">保存</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
