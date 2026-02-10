'use client';

import { useState, useEffect } from 'react';
import { List } from 'lucide-react';
import type { Editor } from '@tiptap/core';
import { useTableOfContents, type TocItem } from './hooks/useTableOfContents';

interface TableOfContentsProps {
  editor: Editor | null;
}

/**
 * 目录侧边栏组件
 * 显示文档中的所有标题，支持点击跳转
 */
export function TableOfContents({ editor }: TableOfContentsProps) {
  const items = useTableOfContents(editor);
  const [activeId, setActiveId] = useState<string | null>(null);

  // 点击目录项，跳转到对应标题
  const handleItemClick = (item: TocItem) => {
    if (!editor) return;

    // 查找对应的 DOM 元素
    const element = document.getElementById(item.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(item.id);
    }
  };

  // 监听滚动，高亮当前位置
  useEffect(() => {
    const handleScroll = () => {
      const headings = items.map(item => ({
        id: item.id,
        element: document.getElementById(item.id),
      }));

      // 找到当前可见的标题
      for (const heading of headings) {
        if (heading.element) {
          const rect = heading.element.getBoundingClientRect();
          if (rect.top >= 0 && rect.top <= 200) {
            setActiveId(heading.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed w-64 max-h-[calc(100vh-200px)] overflow-y-auto dropdown-scrollbar"
      style={{
        right: 'calc((100vw - 1024px) / 4)',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <div className="rounded-xl bg-background-secondary/80 backdrop-blur-sm border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
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
                w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors
                ${activeId === item.id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-white/5'
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
