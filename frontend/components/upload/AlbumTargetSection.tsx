'use client';

import { useEffect, useState } from 'react';
import { useDebouncedCallback } from '@/lib/hooks/useDebouncedCallback';
import { format, isValid, parseISO } from 'date-fns';
import { FolderPlus, FolderOpen, Ban, Search, Calendar, type LucideIcon } from 'lucide-react';
import { albumsApi, type Album } from '@/lib/api/albums';
import type { AlbumTarget } from '@/lib/api/ingestion';
import { SingleDatePicker, type ActiveDatePicker } from '@/components/common/SingleDatePicker';

function parseDateValue(value: string): Date | undefined {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function formatDateValue(date?: Date): string {
  return date ? format(date, 'yyyy-MM-dd') : '';
}

export type AlbumMode = 'none' | 'existing' | 'new';

interface AlbumTargetSectionProps {
  /** 上传开始后传 true，整块锁定为只读 */
  disabled?: boolean;
  onChange: (target: AlbumTarget) => void;
}

export function AlbumTargetSection({ disabled, onChange }: AlbumTargetSectionProps) {
  const [mode, setMode] = useState<AlbumMode>('none');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

  const runSearch = useDebouncedCallback(async (value: string) => {
    setSearching(true);
    try {
      const res = await albumsApi.getAlbums(1, 20, value ? { name: value } : undefined);
      setSearchResults(res.albums);
    } finally {
      setSearching(false);
    }
  }, 300);

  useEffect(() => {
    if (mode !== 'existing') return;
    runSearch(keyword);
  }, [mode, keyword, runSearch]);

  useEffect(() => {
    if (disabled) return; // 锁定后表单不再联动上报，避免和已解析的上传目标冲突
    onChange(resolveAlbumTarget(mode, { selectedAlbum, newName, newDescription, startTime, endTime }));
  }, [disabled, mode, selectedAlbum, newName, newDescription, startTime, endTime, onChange]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-foreground-secondary">归入相册（可选）</div>

      <div className="grid grid-cols-3 gap-2">
        <ModeButton icon={Ban} label="不归入" active={mode === 'none'} disabled={disabled} onClick={() => setMode('none')} />
        <ModeButton icon={FolderPlus} label="新建相册" active={mode === 'new'} disabled={disabled} onClick={() => setMode('new')} />
        <ModeButton icon={FolderOpen} label="选已有" active={mode === 'existing'} disabled={disabled} onClick={() => setMode('existing')} />
      </div>

      {disabled && mode !== 'none' && (
        <p className="text-xs text-foreground-tertiary">上传中不可更改；重试失败项不会重复创建相册</p>
      )}

      {mode === 'new' && (
        <NewAlbumFields
          disabled={disabled}
          name={newName}
          description={newDescription}
          startTime={startTime}
          endTime={endTime}
          onNameChange={setNewName}
          onDescriptionChange={setNewDescription}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
        />
      )}

      {mode === 'existing' && (
        <ExistingAlbumPicker
          disabled={disabled}
          keyword={keyword}
          onKeywordChange={setKeyword}
          searching={searching}
          results={searchResults}
          selectedAlbum={selectedAlbum}
          onSelect={setSelectedAlbum}
        />
      )}
    </div>
  );
}

function resolveAlbumTarget(
  mode: AlbumMode,
  form: { selectedAlbum: Album | null; newName: string; newDescription: string; startTime: string; endTime: string }
): AlbumTarget {
  if (mode === 'existing') {
    return form.selectedAlbum ? { mode: 'existing', albumId: form.selectedAlbum.id } : { mode: 'none' };
  }
  if (mode === 'new') {
    const name = form.newName.trim();
    if (!name) return { mode: 'none' };
    return {
      mode: 'new',
      name,
      description: form.newDescription.trim() || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
    };
  }
  return { mode: 'none' };
}

interface NewAlbumFieldsProps {
  disabled?: boolean;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}

function NewAlbumFields({
  disabled,
  name,
  description,
  startTime,
  endTime,
  onNameChange,
  onDescriptionChange,
  onStartTimeChange,
  onEndTimeChange,
}: NewAlbumFieldsProps) {
  const [activePicker, setActivePicker] = useState<ActiveDatePicker>(null);

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="相册名称，例如：2026 暑假旅行"
        disabled={disabled}
        className="w-full rounded-lg border border-white/10 bg-background-tertiary px-3 py-2.5 text-sm disabled:opacity-50"
      />
      <textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        placeholder="描述（可选）"
        rows={2}
        disabled={disabled}
        className="w-full resize-none rounded-lg border border-white/10 bg-background-tertiary px-3 py-2 text-sm disabled:opacity-50"
      />
      <div>
        <label className="mb-2 flex items-center gap-1.5 text-xs text-foreground-secondary">
          <Calendar size={12} />
          拍摄时间范围
        </label>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-foreground-tertiary">开始时间</label>
            <SingleDatePicker
              pickerKey="start"
              value={parseDateValue(startTime)}
              activeKey={activePicker}
              onActiveChange={setActivePicker}
              onChange={(date) => onStartTimeChange(formatDateValue(date))}
              disabled={disabled}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-foreground-tertiary">结束时间</label>
            <SingleDatePicker
              pickerKey="end"
              value={parseDateValue(endTime)}
              activeKey={activePicker}
              onActiveChange={setActivePicker}
              onChange={(date) => onEndTimeChange(formatDateValue(date))}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ExistingAlbumPickerProps {
  disabled?: boolean;
  keyword: string;
  onKeywordChange: (value: string) => void;
  searching: boolean;
  results: Album[];
  selectedAlbum: Album | null;
  onSelect: (album: Album) => void;
}

function ExistingAlbumPicker({
  disabled,
  keyword,
  onKeywordChange,
  searching,
  results,
  selectedAlbum,
  onSelect,
}: ExistingAlbumPickerProps) {
  return (
    <div className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-tertiary" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="搜索相册名称"
          disabled={disabled}
          className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-background-tertiary border border-white/10 text-sm disabled:opacity-50"
        />
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {searching && <p className="text-xs text-foreground-tertiary px-1">搜索中...</p>}
        {!searching && results.length === 0 && (
          <p className="text-xs text-foreground-tertiary px-1">没有找到相册</p>
        )}
        {results.map((album) => (
          <button
            key={album.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(album)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 ${
              selectedAlbum?.id === album.id ? 'bg-primary/20 text-primary' : 'hover:bg-white/10'
            }`}
          >
            {album.name}
            <span className="text-foreground-tertiary text-xs ml-2">{album.assetCount} 项</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface ModeButtonProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ModeButton({ icon: Icon, label, active, disabled, onClick }: ModeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs transition-colors disabled:opacity-50 ${
        active
          ? 'bg-primary/20 border-primary/40 text-primary'
          : 'bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10'
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
