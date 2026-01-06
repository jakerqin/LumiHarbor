'use client';

import { useState, useRef } from 'react';
import {
  FileText,
  Plus,
  LayoutGrid,
  History,
} from 'lucide-react';
import { NoteGrid } from '@/components/notes/NoteGrid';
import { NoteTimeline } from '@/components/notes/NoteTimeline';
import { createHoverHandlers, createTapHandlers } from '@/lib/utils/gsap';

type ViewMode = 'grid' | 'timeline';

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const createButtonRef = useRef<HTMLButtonElement>(null);

  const handleCreateNote = () => {
    // TODO: 打开创建笔记对话框
    console.log('Create note');
  };

  const handleNoteClick = (id: number) => {
    // TODO: 打开笔记详情模态框
    console.log('Open note:', id);
  };

  const hoverHandlers = createHoverHandlers(createButtonRef.current);
  const tapHandlers = createTapHandlers(createButtonRef.current);

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <FileText size={40} className="text-primary" />
                笔记
              </h1>
              <p className="text-foreground-secondary">记录生活中的点点滴滴</p>
            </div>

            <div className="flex items-center gap-3">
              {/* 视图切换 */}
              <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'hover:bg-white/5 text-foreground-secondary'
                  }`}
                >
                  <LayoutGrid size={20} />
                  <span className="text-sm font-medium">网格</span>
                </button>
                <button
                  onClick={() => setViewMode('timeline')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    viewMode === 'timeline'
                      ? 'bg-primary text-white'
                      : 'hover:bg-white/5 text-foreground-secondary'
                  }`}
                >
                  <History size={20} />
                  <span className="text-sm font-medium">时间轴</span>
                </button>
              </div>

              {/* 创建按钮 */}
              <button
                ref={createButtonRef}
                onClick={handleCreateNote}
                {...hoverHandlers}
                {...tapHandlers}
                className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">写笔记</span>
              </button>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div>
          {viewMode === 'grid' ? (
            <NoteGrid onNoteClick={handleNoteClick} />
          ) : (
            <NoteTimeline onNoteClick={handleNoteClick} />
          )}
        </div>
      </div>
    </div>
  );
}
