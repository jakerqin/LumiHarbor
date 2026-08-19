'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MenuSelect } from '@/components/common/MenuSelect';
import { tagsApi, type TagDefinition } from '@/lib/api/tags';

const INPUT_TYPES = [
  { value: 1, label: '文本' },
  { value: 3, label: '日期范围' },
  { value: 4, label: '单选' },
  { value: 5, label: '多选' },
];

/** 需要预设选项的控件：单选 / 多选 */
const OPTION_INPUT_TYPES = new Set([4, 5]);

export default function SettingsTagsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<TagDefinition | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useQuery({
    queryKey: ['tag-definitions'],
    queryFn: () => tagsApi.getTagDefinitions(),
  });

  const mappingsQuery = useQuery({
    queryKey: ['tag-mappings', editing?.tag_key],
    queryFn: () => tagsApi.getMappings(editing?.tag_key),
    enabled: Boolean(editing?.tag_key),
  });

  const items = query.data ?? [];
  const systemItems = useMemo(() => items.filter((i) => i.source === 'system'), [items]);
  const userItems = useMemo(() => items.filter((i) => i.source !== 'system'), [items]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tag-definitions'] });
    queryClient.invalidateQueries({ queryKey: ['tag-mappings'] });
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading">用户标签</h2>
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditing(null);
            }}
            className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm"
          >
            新建标签
          </button>
        </div>
        <TagList items={userItems} loading={query.isLoading} onEdit={setEditing} />
      </section>
      <section>
        <h2 className="text-lg font-heading mb-3">系统标签</h2>
        <TagList items={systemItems} loading={query.isLoading} onEdit={setEditing} />
      </section>

      {(creating || editing) && (
        <TagEditor
          key={editing?.id ?? 'new'}
          item={editing}
          creating={creating}
          mappings={mappingsQuery.data ?? []}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            invalidate();
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function TagList({
  items,
  loading,
  onEdit,
}: {
  items: TagDefinition[];
  loading: boolean;
  onEdit: (item: TagDefinition) => void;
}) {
  if (loading) {
    return <div className="h-24 rounded-2xl bg-background-secondary border border-white/10 animate-pulse" />;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground-secondary rounded-2xl border border-white/10 bg-background-secondary p-4">
        暂无标签
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-background-secondary divide-y divide-white/5">
      {items.map((item) => (
        <button
          key={item.tag_key}
          type="button"
          onClick={() => onEdit(item)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5"
        >
          <span>
            <span className="text-foreground">{item.tag_name}</span>
            <span className="ml-2 text-xs text-foreground-tertiary">{item.tag_key}</span>
          </span>
          <span className="text-xs text-foreground-secondary">
            {INPUT_TYPES.find((t) => t.value === item.input_type)?.label || '文本'}
          </span>
        </button>
      ))}
    </div>
  );
}

function TagEditor({
  item,
  creating,
  mappings,
  onClose,
  onSaved,
}: {
  item: TagDefinition | null;
  creating: boolean;
  mappings: { id: number; source_key: string; transform: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.tag_name || '');
  const [key, setKey] = useState(item?.tag_key || '');
  const [inputType, setInputType] = useState(item?.input_type || 1);
  const [optionsText, setOptionsText] = useState(readOptions(item));
  const [sourceKey, setSourceKey] = useState('');
  const showOptions = OPTION_INPUT_TYPES.has(Number(inputType));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const extra_info = buildExtraInfo(item?.extra_info, showOptions ? optionsText : '');
      if (creating) {
        return tagsApi.createDefinition({
          tag_key: key.trim(),
          tag_name: name.trim(),
          input_type: Number(inputType),
          extra_info,
          source: 'user',
        });
      }
      if (!item?.id) throw new Error('缺少定义 ID');
      return tagsApi.updateDefinition(item.id, {
        tag_name: name.trim(),
        input_type: Number(inputType),
        extra_info,
      });
    },
    onSuccess: () => {
      toast.success('已保存');
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || '保存失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tagsApi.deleteDefinition(item!.id!),
    onSuccess: () => {
      toast.success('已删除');
      onSaved();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || '删除失败'),
  });

  const addMapping = useMutation({
    mutationFn: () =>
      tagsApi.createMapping({
        tag_key: item!.tag_key,
        source_key: sourceKey.trim(),
        asset_type: null,
        transform: 'identity',
        priority: mappings.length,
      }),
    onSuccess: () => {
      setSourceKey('');
      onSaved();
      toast.success('映射已添加');
    },
    onError: (err: Error) => toast.error(err.message || '添加失败'),
  });

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="关闭" />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-background-secondary border-l border-white/10 p-6 overflow-y-auto">
        <h3 className="text-lg font-heading mb-4">{creating ? '新建标签' : '编辑标签'}</h3>
        <label className="block text-xs text-foreground-tertiary mb-1">显示名</label>
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <label className="block text-xs text-foreground-tertiary mt-4 mb-1">tag_key</label>
        <input className={inputClass} value={key} disabled={!creating} onChange={(e) => setKey(e.target.value)} />
        <label className="block text-xs text-foreground-tertiary mt-4 mb-1">控件</label>
        <MenuSelect
          value={String(inputType)}
          options={INPUT_TYPES.map((item) => ({ value: String(item.value), label: item.label }))}
          onChange={(next) => setInputType(Number(next))}
        />
        {showOptions && (
          <>
            <label className="mt-4 mb-1 block text-xs text-foreground-tertiary">选项（每行一个）</label>
            <textarea
              className={`${inputClass} min-h-[96px]`}
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
            />
          </>
        )}

        <div className="mt-6 flex gap-2">
          <button type="button" className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm" onClick={() => saveMutation.mutate()}>
            保存
          </button>
          {item?.source === 'user' && item.id && (
            <button type="button" className="h-10 px-4 rounded-full text-sm text-red-400" onClick={() => deleteMutation.mutate()}>
              删除
            </button>
          )}
          <button type="button" className="h-10 px-4 rounded-full text-sm text-foreground-secondary" onClick={onClose}>
            取消
          </button>
        </div>

        {!creating && item && (
          <div className="mt-8">
            <h4 className="text-sm font-medium mb-2">元数据映射</h4>
            <ul className="space-y-2 mb-3">
              {mappings.map((m) => (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.source_key} → {item.tag_key}</span>
                  <button type="button" className="text-xs text-red-400" onClick={() => tagsApi.deleteMapping(m.id).then(onSaved)}>
                    移除
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input className={inputClass} placeholder="源键，如 Image Model" value={sourceKey} onChange={(e) => setSourceKey(e.target.value)} />
              <button type="button" className="h-10 px-3 rounded-full bg-white/10 text-sm" onClick={() => addMapping.mutate()} disabled={!sourceKey.trim()}>
                添加
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass = 'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm';

function readOptions(item: TagDefinition | null): string {
  const options = item?.extra_info?.options;
  if (!Array.isArray(options)) return '';
  return options.map((opt) => (typeof opt === 'string' ? opt : String((opt as { value?: string }).value || ''))).join('\n');
}

function buildExtraInfo(
  current: Record<string, unknown> | null | undefined,
  optionsText: string
): Record<string, unknown> {
  const extra = { ...(current || {}) };
  const options = optionsText.split('\n').map((s) => s.trim()).filter(Boolean);
  if (options.length) extra.options = options;
  else delete extra.options;
  return extra;
}
