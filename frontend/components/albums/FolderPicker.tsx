'use client';

import { useRef } from 'react';
import { Folder, FolderOpen, X } from 'lucide-react';
import { toast } from 'sonner';

const MEDIA_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.heic', '.raw', '.mp4', '.mov', '.avi',
]);

interface FolderPickerProps {
  folderName: string;
  fileCount: number;
  disabled?: boolean;
  onPick: (files: File[], folderName: string) => void;
  onClear: () => void;
}

export function FolderPicker({
  folderName,
  fileCount,
  disabled,
  onPick,
  onClear,
}: FolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = async () => {
    if (canUseDirectoryPicker()) {
      const picked = await pickWithDirectoryApi();
      if (picked === null) return;
      applyPicked(picked, onPick);
      return;
    }
    inputRef.current?.click();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((file) => MEDIA_EXT.has(extOf(file.name)));
          e.target.value = '';
          applyPicked({ files, folderName: '已选文件' }, onPick);
        }}
      />
      {folderName ? (
        <SelectedFolder folderName={folderName} fileCount={fileCount} disabled={disabled} onClear={onClear} />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={handlePick}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-foreground-secondary hover:border-primary/30 hover:bg-white/5 disabled:opacity-50"
        >
          <Folder size={18} />
          选择本地文件夹
        </button>
      )}
    </>
  );
}

function SelectedFolder({
  folderName,
  fileCount,
  disabled,
  onClear,
}: {
  folderName: string;
  fileCount: number;
  disabled?: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
      <FolderOpen size={18} className="shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{folderName}</p>
        <p className="text-xs text-foreground-secondary">{fileCount} 个素材</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onClear}
        className="rounded-lg p-1.5 text-foreground-secondary hover:bg-white/10 disabled:opacity-50"
        aria-label="清除所选文件夹"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function applyPicked(
  picked: { files: File[]; folderName: string },
  onPick: (files: File[], folderName: string) => void,
) {
  if (!picked.files.length) {
    toast.error('该文件夹没有可导入的图片或视频');
    return;
  }
  onPick(picked.files, picked.folderName);
}

function canUseDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function pickWithDirectoryApi(): Promise<{ files: File[]; folderName: string } | null> {
  try {
    const dir = await window.showDirectoryPicker({ mode: 'read' });
    return { folderName: dir.name, files: await collectMediaFiles(dir) };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    toast.error('无法打开文件夹选择器');
    return null;
  }
}

async function collectMediaFiles(dir: FileSystemDirectoryHandle): Promise<File[]> {
  const files: File[] = [];
  for await (const handle of dir.values()) {
    if (handle.kind === 'directory') {
      files.push(...await collectMediaFiles(handle));
    } else if (handle.kind === 'file' && MEDIA_EXT.has(extOf(handle.name))) {
      files.push(await handle.getFile());
    }
  }
  return files;
}

function extOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index).toLowerCase() : '';
}
