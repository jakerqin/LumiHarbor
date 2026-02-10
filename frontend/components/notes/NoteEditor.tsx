'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { NoteTitleInput } from './NoteTitleInput';
import { NoteCoverImage } from './NoteCoverImage';
import TailwindAdvancedEditor from './novel-native/tailwind/advanced-editor';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import type { Asset } from '@/lib/api/types';
import type { JSONContent } from 'novel';

interface NoteEditorProps {
  initialTitle?: string;
  initialCoverAsset?: Asset | null;
  initialContent?: JSONContent;
  onSave?: (data: {
    title: string;
    coverAssetId: number | null;
    content: JSONContent;
  }) => void | Promise<void>;
  autoSave?: boolean;
  onSavingChange?: (isSaving: boolean) => void;
  onLastSavedChange?: (lastSaved: Date | null) => void;
}

export interface NoteEditorRef {
  triggerSave: () => Promise<void>;
}

export const NoteEditor = forwardRef<NoteEditorRef, NoteEditorProps>(({
  initialTitle = '',
  initialCoverAsset = null,
  initialContent,
  onSave,
  autoSave = true,
  onSavingChange,
  onLastSavedChange,
}, ref) => {
  const [title, setTitle] = useState(initialTitle);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(initialCoverAsset);
  const [content, setContent] = useState<JSONContent | undefined>(initialContent);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleAssetSelect = (asset: Asset) => {
    setCoverAsset(asset);
    setIsAssetPickerOpen(false);
  };

  const handleRemoveCover = () => {
    setCoverAsset(null);
  };

  // 自动保存逻辑
  const triggerAutoSave = async () => {
    if (!onSave || !autoSave) return;

    onSavingChange?.(true);

    try {
      await onSave({
        title,
        coverAssetId: coverAsset?.id || null,
        content: content || { type: 'doc', content: [] },
      });

      const now = new Date();
      onLastSavedChange?.(now);
    } catch (error) {
      console.error('自动保存失败:', error);
    } finally {
      onSavingChange?.(false);
    }
  };

  const handleContentSave = async (newContent: JSONContent) => {
    setContent(newContent);

    if (autoSave) {
      // 防抖：延迟 2 秒后保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        triggerAutoSave();
      }, 2000);
    }
  };

  // 暴露手动保存方法给父组件
  useImperativeHandle(ref, () => ({
    triggerSave: async () => {
      // 清除防抖定时器，立即保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await triggerAutoSave();
    },
  }));

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-screen-lg">
      {/* 统一的白色容器 */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 封面图区域 */}
          <NoteCoverImage
            asset={coverAsset}
            onRemove={handleRemoveCover}
            onReplace={() => setIsAssetPickerOpen(true)}
          />

          {/* 标题区域 */}
          <div className="px-12 pt-2 pb-4">
            <NoteTitleInput
              value={title}
              onChange={setTitle}
              showAddCover={!coverAsset}
              onAddCover={() => setIsAssetPickerOpen(true)}
            />
          </div>

          {/* 编辑器区域 */}
          <div className="px-0">
            <TailwindAdvancedEditor
              initialContent={content}
              onSave={handleContentSave}
              autoSave={autoSave}
            />
          </div>
      </div>

      {/* 素材选择器 Modal */}
      <AssetPickerModal
        open={isAssetPickerOpen}
        title="选择封面图"
        description="从素材库中选择一张图片作为笔记封面"
        onClose={() => setIsAssetPickerOpen(false)}
        onSelect={handleAssetSelect}
      />
    </div>
  );
});

NoteEditor.displayName = 'NoteEditor';
