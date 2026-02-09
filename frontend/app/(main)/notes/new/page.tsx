'use client';

import { useRouter } from 'next/navigation';
import { NoteEditor } from '@/components/notes/NoteEditor';
import { notesApi } from '@/lib/api/notes';
import { toast } from 'sonner';
import type { JSONContent } from 'novel';

export default function NewNotePage() {
  const router = useRouter();

  const handleSave = async (data: {
    title: string;
    coverAssetId: number | null;
    content: JSONContent;
  }) => {
    try {
      // 创建笔记
      const note = await notesApi.createNote({
        title: data.title || '无标题',
        content: data.content,
        cover_asset_id: data.coverAssetId,
      });

      // 保存成功提示
      toast.success('笔记已保存');

      // 保存成功后跳转到笔记详情页
      router.push(`/notes/${note.id}`);
    } catch (error) {
      console.error('保存笔记失败:', error);
      toast.error('保存失败，请重试');
    }
  };

  return (
    <NoteEditor
      onSave={handleSave}
      autoSave={false}
    />
  );
}
