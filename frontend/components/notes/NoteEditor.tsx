'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { NoteTitleInput } from './NoteTitleInput';
import { NoteCoverImage } from './NoteCoverImage';
import { NotePaperShell } from './NotePaperShell';
import TailwindAdvancedEditor from './novel-native/tailwind/advanced-editor';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import { jsonToMarkdown } from '@/lib/utils/jsonToMarkdown';
import type { Asset } from '@/lib/api/types';
import type { JSONContent } from 'novel';

interface NoteEditorProps {
  initialTitle?: string;
  initialCoverAsset?: Asset | null;
  initialCoverPositionX?: number;
  initialCoverPositionY?: number;
  initialContent?: JSONContent;
  onSave?: (data: {
    title: string;
    coverAssetId: number | null;
    coverPositionX: number;
    coverPositionY: number;
    content: JSONContent;
    contentMarkdown: string;
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
  initialCoverPositionX = 50,
  initialCoverPositionY = 50,
  initialContent,
  onSave,
  autoSave = true,
  onSavingChange,
  onLastSavedChange,
}, ref) => {
  const [title, setTitle] = useState(initialTitle);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(initialCoverAsset);
  const [coverPositionX, setCoverPositionX] = useState(initialCoverPositionX);
  const [coverPositionY, setCoverPositionY] = useState(initialCoverPositionY);
  const [content, setContent] = useState<JSONContent | undefined>(initialContent);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipMetaSaveRef = useRef(true);
  const latestRef = useRef<{
    title: string;
    coverAssetId: number | null;
    coverPositionX: number;
    coverPositionY: number;
    content: JSONContent | undefined;
  }>({
    title: initialTitle,
    coverAssetId: initialCoverAsset?.id ?? null,
    coverPositionX: initialCoverPositionX,
    coverPositionY: initialCoverPositionY,
    content: initialContent,
  });
  latestRef.current = {
    title,
    coverAssetId: coverAsset?.id ?? null,
    coverPositionX,
    coverPositionY,
    content,
  };

  const handleAssetSelect = (asset: Asset) => {
    setCoverAsset(asset);
    setCoverPositionX(50);
    setCoverPositionY(50);
    setIsAssetPickerOpen(false);
  };

  const handleRemoveCover = () => {
    setCoverAsset(null);
    setCoverPositionX(50);
    setCoverPositionY(50);
  };

  const triggerAutoSave = async () => {
    if (!onSave || !autoSave) return;

    onSavingChange?.(true);

    try {
      const latest = latestRef.current;
      const currentContent = latest.content || { type: 'doc', content: [] };
      const markdown = jsonToMarkdown(currentContent);

      await onSave({
        title: latest.title,
        coverAssetId: latest.coverAssetId,
        coverPositionX: latest.coverPositionX,
        coverPositionY: latest.coverPositionY,
        content: currentContent,
        contentMarkdown: markdown,
      });

      onLastSavedChange?.(new Date());
    } catch (error) {
      console.error('自动保存失败:', error);
    } finally {
      onSavingChange?.(false);
    }
  };

  const scheduleSave = () => {
    if (!autoSave) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      void triggerAutoSave();
    }, 2000);
  };

  const handleContentSave = async (newContent: JSONContent) => {
    latestRef.current.content = newContent;
    setContent(newContent);
    scheduleSave();
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
  };

  const handlePositionChange = (x: number, y: number) => {
    setCoverPositionX(x);
    setCoverPositionY(y);
  };

  // 标题 / 封面 / 焦点变化后防抖保存（跳过首帧挂载）
  useEffect(() => {
    if (skipMetaSaveRef.current) {
      skipMetaSaveRef.current = false;
      return;
    }
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, coverAsset?.id, coverPositionX, coverPositionY]);

  useImperativeHandle(ref, () => ({
    triggerSave: async () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await triggerAutoSave();
    },
  }));

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl lg:max-w-4xl">
      <NotePaperShell>
        <NoteCoverImage
          asset={coverAsset}
          positionX={coverPositionX}
          positionY={coverPositionY}
          onPositionChange={handlePositionChange}
          onRemove={handleRemoveCover}
          onReplace={() => setIsAssetPickerOpen(true)}
        />

        <div className="px-8 sm:px-12 pt-10 pb-2">
          <NoteTitleInput
            value={title}
            onChange={handleTitleChange}
            showAddCover={!coverAsset}
            onAddCover={() => setIsAssetPickerOpen(true)}
          />
        </div>

        <TailwindAdvancedEditor
          initialContent={content}
          onSave={handleContentSave}
          autoSave={autoSave}
        />
      </NotePaperShell>

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
