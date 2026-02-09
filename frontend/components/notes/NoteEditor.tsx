'use client';

import { useState } from 'react';
import { NoteTitleInput } from './NoteTitleInput';
import { NoteCoverImage } from './NoteCoverImage';
import TailwindAdvancedEditor from './novel-native/tailwind/advanced-editor';
import { AssetPickerModal } from '@/components/assets/AssetPickerModal';
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
}

export function NoteEditor({
  initialTitle = '',
  initialCoverAsset = null,
  initialContent,
  onSave,
  autoSave = true,
}: NoteEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(initialCoverAsset);
  const [content, setContent] = useState<JSONContent | undefined>(initialContent);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);

  const handleAssetSelect = (asset: Asset) => {
    setCoverAsset(asset);
    setIsAssetPickerOpen(false);
  };

  const handleRemoveCover = () => {
    setCoverAsset(null);
  };

  const handleContentSave = async (newContent: JSONContent) => {
    setContent(newContent);

    if (onSave) {
      await onSave({
        title,
        coverAssetId: coverAsset?.id || null,
        content: newContent,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
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
          <div className="px-12 pt-12 pb-4">
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
}
