'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Article,
  Plus,
  SquaresFour,
  ClockCounterClockwise,
} from '@phosphor-icons/react/dist/ssr';
import { NoteGrid } from '@/components/notes/NoteGrid';
import { NoteTimeline } from '@/components/notes/NoteTimeline';

type ViewMode = 'grid' | 'timeline';

export default function NotesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const handleCreateNote = () => {
    // TODO: 打开创建笔记对话框
    console.log('Create note');
  };

  const handleNoteClick = (id: number) => {
    // TODO: 打开笔记详情模态框
    console.log('Open note:', id);
  };

  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* 页面头部 */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-3">
                <Article size={40} weight="duotone" className="text-primary" />
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
                  <SquaresFour size={20} weight="duotone" />
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
                  <ClockCounterClockwise size={20} weight="duotone" />
                  <span className="text-sm font-medium">时间轴</span>
                </button>
              </div>

              {/* 创建按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreateNote}
                className="px-6 py-3 bg-primary hover:bg-primary-hover rounded-xl flex items-center gap-2 transition-colors"
              >
                <Plus size={20} weight="bold" />
                <span className="font-medium">写笔记</span>
              </motion.button>
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
