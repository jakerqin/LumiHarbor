'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Calendar, Image as ImageIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AssetPickerModal } from '@/components/common/AssetPickerModal';
import type { Asset } from '@/lib/api/types';
import type { Album } from '@/lib/api/albums';
import { DayPicker, type DropdownProps as DayPickerDropdownProps } from 'react-day-picker';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CreateAlbumModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialData?: Album;
  onClose: () => void;
  onSubmit: (data: CreateAlbumData) => void;
  loading?: boolean;
}

export interface CreateAlbumData {
  name: string;
  description: string;
  start_time?: string;
  end_time?: string;
  cover_asset_id?: number;
}

function formatDate(date?: Date): string | undefined {
  if (!date) return undefined;
  return format(date, 'yyyy-MM-dd');
}

function CustomDropdown(props: DayPickerDropdownProps) {
  const { value, onChange, options, name } = props;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const selected = list.querySelector<HTMLButtonElement>('[data-selected="true"]');
      if (!selected) return;
      const listRect = list.getBoundingClientRect();
      const itemRect = selected.getBoundingClientRect();
      const targetOffset = itemRect.top - listRect.top - (listRect.height / 2 - itemRect.height / 2);
      list.scrollTop += targetOffset;
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, value]);

  const selectedOption = options?.find((opt) => opt.value === Number(value));
  const displayLabel = selectedOption?.label || '';

  const handleSelect = (optValue: number) => {
    const syntheticEvent = {
      target: { value: String(optValue), name },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange?.(syntheticEvent);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/10 text-sm hover:bg-white/15 transition-colors focus:outline-none focus:border-primary/50"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={14} className={`text-foreground-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          className="dropdown-scrollbar absolute top-full left-0 mt-1 min-w-[80px] max-h-[200px] overflow-y-auto rounded-lg bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-xl z-[60]"
        >
          {options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={opt.disabled}
              data-selected={opt.value === Number(value)}
              onClick={() => handleSelect(opt.value)}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors ${
                opt.value === Number(value)
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-white/5'
              } ${opt.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type DatePickerKey = 'start' | 'end';
type ActiveDatePicker = DatePickerKey | null;

interface SingleDatePickerProps {
  pickerKey: DatePickerKey;
  value?: Date;
  activeKey: ActiveDatePicker;
  onActiveChange: (key: ActiveDatePicker) => void;
  onChange: (date?: Date) => void;
  disabled?: boolean;
}

function SingleDatePicker({
  pickerKey,
  value,
  activeKey,
  onActiveChange,
  onChange,
  disabled,
}: SingleDatePickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isOpen = activeKey === pickerKey;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onActiveChange(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onActiveChange]);

  const displayValue = value ? format(value, 'yyyy-MM-dd') : '选择日期';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => onActiveChange(isOpen ? null : pickerKey)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-left flex items-center justify-between gap-2 hover:border-primary/50 transition-colors disabled:opacity-50"
        disabled={disabled}
      >
        <span className={value ? 'text-foreground' : 'text-foreground-secondary'}>
          {displayValue}
        </span>
        <Calendar size={14} className="text-foreground-secondary" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 rounded-2xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl z-50 p-4">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange(date || undefined);
              onActiveChange(null);
            }}
            locale={zhCN}
            showOutsideDays
            captionLayout="dropdown"
            startMonth={new Date(2000, 0)}
            endMonth={new Date(2030, 11)}
            classNames={{
              root: 'date-picker-root',
              months: 'flex gap-4',
              month: 'space-y-3',
              month_caption: 'flex justify-center items-center gap-2 h-8 relative',
              caption_label: 'hidden',
              dropdowns: 'flex items-center gap-2',
              nav: 'flex items-center gap-1',
              button_previous: 'p-1.5 rounded-lg hover:bg-white/10 transition-colors absolute left-0 top-0',
              button_next: 'p-1.5 rounded-lg hover:bg-white/10 transition-colors absolute right-0 top-0',
              weekdays: 'flex',
              weekday: 'w-9 h-9 flex items-center justify-center text-xs text-foreground-secondary font-medium',
              week: 'flex',
              day: 'w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors hover:bg-white/10',
              day_button: 'w-full h-full flex items-center justify-center',
              selected: 'bg-primary/20 text-primary font-medium',
              today: 'ring-1 ring-primary/50',
              outside: 'text-foreground-secondary/40',
              disabled: 'text-foreground-secondary/30 cursor-not-allowed',
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left' ? (
                  <ChevronLeft size={16} className="text-foreground-secondary" />
                ) : (
                  <ChevronRight size={16} className="text-foreground-secondary" />
                ),
              Dropdown: CustomDropdown,
            }}
          />

          <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="px-3 py-1.5 text-sm text-foreground-secondary hover:text-foreground rounded-lg hover:bg-white/5 transition-colors"
              disabled={disabled}
            >
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreateAlbumModal({ open, mode = 'create', initialData, onClose, onSubmit, loading }: CreateAlbumModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [activePicker, setActivePicker] = useState<ActiveDatePicker>(null);
  const [coverAsset, setCoverAsset] = useState<Asset | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);

  // 编辑模式下回显数据
  useEffect(() => {
    if (mode === 'edit' && initialData && open) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setStartDate(initialData.startTime ? new Date(initialData.startTime) : undefined);
      setEndDate(initialData.endTime ? new Date(initialData.endTime) : undefined);

      // 封面回显：如果有 coverUrl，创建一个临时 Asset 对象
      if (initialData.coverUrl) {
        setCoverAsset({
          id: 0, // 临时 ID，后端会使用 cover_asset_id
          thumbnail_url: initialData.coverUrl,
          preview_url: initialData.coverPreviewUrl,
          original_url: initialData.coverOriginalUrl,
          original_path: initialData.name,
        } as Asset);
      } else {
        setCoverAsset(null);
      }
    } else if (mode === 'create' && open) {
      // 创建模式下重置表单
      setName('');
      setDescription('');
      setStartDate(undefined);
      setEndDate(undefined);
      setCoverAsset(null);
    }
  }, [mode, initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      window.alert('请输入相册名称');
      return;
    }

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      start_time: formatDate(startDate),
      end_time: formatDate(endDate),
      cover_asset_id: coverAsset?.id,
    });
  };

  const handleClose = () => {
    if (loading) return;
    setName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setActivePicker(null);
    setCoverAsset(null);
    onClose();
  };

  const handleSelectCover = (asset: Asset) => {
    setCoverAsset(asset);
  };

  if (!open) return null;

  const modalTitle = mode === 'edit' ? '编辑相册' : '创建相册';
  const submitButtonText = mode === 'edit' ? '保存' : '创建相册';
  const submitButtonLoadingText = mode === 'edit' ? '保存中...' : '创建中...';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal 内容 */}
        <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold">{modalTitle}</h2>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
              aria-label="关闭"
            >
              <X size={20} />
            </button>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* 相册名称 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                相册名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入相册名称..."
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
                disabled={loading}
                autoFocus
              />
            </div>

            {/* 相册描述 */}
            <div>
              <label className="block text-sm font-medium mb-2">相册描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="输入相册描述..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                disabled={loading}
              />
            </div>

            {/* 时间范围 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-foreground-secondary" />
                拍摄时间范围
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    开始时间
                  </label>
                  <SingleDatePicker
                    pickerKey="start"
                    value={startDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setStartDate}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-secondary mb-2">
                    结束时间
                  </label>
                  <SingleDatePicker
                    pickerKey="end"
                    value={endDate}
                    activeKey={activePicker}
                    onActiveChange={setActivePicker}
                    onChange={setEndDate}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* 封面素材 */}
            <div>
              <label className="block text-sm font-medium mb-2 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-foreground-secondary" />
                封面素材
              </label>
              {coverAsset ? (
                <div className="relative group">
                  <img
                    src={coverAsset.thumbnail_url || '/icon.svg'}
                    alt={coverAsset.original_path || '封面'}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssetPickerOpen(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      更换
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverAsset(null)}
                      className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                      disabled={loading}
                    >
                      移除
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAssetPickerOpen(true)}
                  className="w-full h-48 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 hover:bg-white/5 transition-colors flex flex-col items-center justify-center gap-2 text-foreground-secondary"
                  disabled={loading}
                >
                  <ImageIcon size={32} />
                  <span className="text-sm">点击选择封面素材</span>
                </button>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? submitButtonLoadingText : submitButtonText}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* 素材选择器 */}
      <AssetPickerModal
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={handleSelectCover}
      />
    </>
  );
}
