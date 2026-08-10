'use client';

import { useState, useEffect } from 'react';
import { List } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { useTableOfContents, type TocItem } from './hooks/useTableOfContents';

interface TableOfContentsProps {
  editor: Editor | null;
}

const TOC_WIDTH = 256;
const TOC_GAP = 20;
/** 右侧至少要能放下目录 + 边距，否则隐藏，避免盖住正文 */
const MIN_RIGHT_SPACE = TOC_WIDTH + TOC_GAP * 2;

/**
 * 目录侧边栏：仅在编辑面右侧留白足够时显示
 */
export function TableOfContents({ editor }: TableOfContentsProps) {
  const items = useTableOfContents(editor);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [layout, setLayout] = useState<{ left: number; visible: boolean }>({
    left: 0,
    visible: false,
  });

  useEffect(() => {
    const updateLayout = () => {
      const surface = document.querySelector<HTMLElement>('[data-note-editor-surface]');
      if (!surface) {
        setLayout({ left: 0, visible: false });
        return;
      }
      const rect = surface.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;
      const visible = spaceRight >= MIN_RIGHT_SPACE;
      setLayout({
        visible,
        left: rect.right + TOC_GAP,
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);

    const surface = document.querySelector('[data-note-editor-surface]');
    const observer =
      typeof ResizeObserver !== 'undefined' && surface
        ? new ResizeObserver(updateLayout)
        : null;
    if (surface && observer) observer.observe(surface);

    return () => {
      window.removeEventListener('resize', updateLayout);
      observer?.disconnect();
    };
  }, [items.length]);

  useEffect(() => {
    const handleScroll = () => {
      for (const item of items) {
        const element = document.getElementById(item.id);
        if (!element) continue;
        const rect = element.getBoundingClientRect();
        if (rect.top >= 0 && rect.top <= 200) {
          setActiveId(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  const handleItemClick = (item: TocItem) => {
    if (!editor) return;
    const element = document.getElementById(item.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(item.id);
    }
  };

  if (items.length === 0 || !layout.visible) {
    return null;
  }

  return (
    <div
      className="fixed z-20 w-64 max-h-[calc(100vh-200px)] overflow-y-auto dropdown-scrollbar"
      style={{
        left: layout.left,
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <div className="rounded-xl border border-white/10 bg-background-secondary/80 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-2">
          <List size={16} className="text-foreground-secondary" />
          <h3 className="text-sm font-medium text-foreground-secondary">目录</h3>
        </div>

        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`
                w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors
                ${
                  activeId === item.id
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-foreground-secondary hover:bg-white/5 hover:text-foreground'
                }
              `}
              style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
            >
              <span className="line-clamp-2">{item.text || '无标题'}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
