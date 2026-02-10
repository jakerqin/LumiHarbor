import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/core';

export interface TocItem {
  id: string;
  level: number;
  text: string;
  position: number;
}

/**
 * 从编辑器中提取目录数据
 * @param editor Tiptap 编辑器实例
 * @returns 目录项数组
 */
export function useTableOfContents(editor: Editor | null): TocItem[] {
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    if (!editor) {
      setItems([]);
      return;
    }

    const updateToc = () => {
      const headings: TocItem[] = [];
      const doc = editor.state.doc;

      doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          const id = node.attrs.id || `heading-${pos}`;
          const level = node.attrs.level || 1;
          const text = node.textContent;

          headings.push({
            id,
            level,
            text,
            position: pos,
          });
        }
      });

      setItems(headings);
    };

    // 初始化时提取一次
    updateToc();

    // 监听编辑器更新
    editor.on('update', updateToc);

    return () => {
      editor.off('update', updateToc);
    };
  }, [editor]);

  return items;
}
