'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { MenuSelect } from '@/components/common/MenuSelect';
import { templatesApi, type Template, type TemplateField } from '@/lib/api/templates';
import { tagsApi, type TagDefinition } from '@/lib/api/tags';

const KIND_LABEL: Record<string, string> = {
  ingest: '导入',
  detail: '详情',
  filter: '筛选',
  card: '卡片',
};

const FIELD_SOURCE_OPTIONS = [
  { value: 'tag', label: '标签' },
  { value: 'asset', label: '素材列' },
  { value: 'relation', label: '关联' },
];

const ASSET_FIELD_OPTIONS = [
  { value: 'asset_type', label: '素材类型', hint: 'asset_type' },
  { value: 'file_size', label: '文件大小', hint: 'file_size' },
  { value: 'shot_at', label: '拍摄时间', hint: 'shot_at' },
  { value: 'created_at', label: '入库时间', hint: 'created_at' },
];

const RELATION_FIELD_OPTIONS = [
  { value: 'is_favorited', label: '是否收藏', hint: 'is_favorited' },
];

const ASSET_TYPE_OPTIONS = [
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
];

export default function SettingsTemplatesPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const listQuery = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });
  const templates = listQuery.data ?? [];
  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  const fieldsQuery = useQuery({
    queryKey: ['template-fields', selected?.id],
    queryFn: () => templatesApi.listFields(selected!.id),
    enabled: Boolean(selected?.id),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="lg:col-span-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading">模板</h2>
          <button type="button" className="text-sm text-primary" onClick={() => setCreating(true)}>
            新建
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-background-secondary divide-y divide-white/5">
          {templates.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full px-4 py-3 text-left ${selected?.id === item.id ? 'bg-white/5' : ''}`}
            >
              <div className="text-sm">{item.name}</div>
              <div className="text-xs text-foreground-tertiary">
                {KIND_LABEL[item.kind] || item.kind} · {item.asset_type || '全部'}
                {item.is_default ? ' · 默认' : ''}
              </div>
            </button>
          ))}
        </div>
      </aside>
      <section className="lg:col-span-8">
        {selected ? (
          <TemplateFieldsPanel
            template={selected}
            fields={fieldsQuery.data ?? []}
            loading={fieldsQuery.isLoading}
            onChanged={() => {
              queryClient.invalidateQueries({ queryKey: ['template-fields'] });
              queryClient.invalidateQueries({ queryKey: ['templates'] });
            }}
          />
        ) : (
          <p className="text-sm text-foreground-secondary">还没有模板</p>
        )}
      </section>
      {creating && (
        <CreateTemplateDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ['templates'] });
            setSelectedId(id);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function TemplateFieldsPanel({
  template,
  fields,
  loading,
  onChanged,
}: {
  template: Template;
  fields: TemplateField[];
  loading: boolean;
  onChanged: () => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-background-secondary p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-heading">{template.name}</h3>
          <p className="text-xs text-foreground-tertiary">{template.code}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={template.is_default}
              onChange={(e) =>
                templatesApi.update(template.id, { is_default: e.target.checked }).then(onChanged)
              }
            />
            默认
          </label>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-sm text-primary-foreground"
          >
            <Plus size={14} />
            添加字段
          </button>
        </div>
      </div>
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {fields.map((field) => (
            <li key={field.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
              <span className="text-sm">
                {field.tag_name || field.field_key}
                <span className="ml-2 text-xs text-foreground-tertiary">
                  {field.field_source}.{field.field_key}
                </span>
              </span>
              <button
                type="button"
                className="text-xs text-red-400"
                onClick={() => templatesApi.deleteField(field.id).then(onChanged)}
              >
                移除
              </button>
            </li>
          ))}
          {!fields.length && (
            <li className="py-10 text-center text-sm text-foreground-secondary">
              还没有字段，点右上角添加
            </li>
          )}
        </ul>
      )}
      {adding && (
        <AddFieldDialog
          template={template}
          fields={fields}
          onClose={() => setAdding(false)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function AddFieldDialog({
  template,
  fields,
  onClose,
  onChanged,
}: {
  template: Template;
  fields: TemplateField[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const tagsQuery = useQuery({
    queryKey: ['tag-definitions'],
    queryFn: () => tagsApi.getTagDefinitions(),
  });
  const [fieldSource, setFieldSource] = useState('tag');
  const [fieldKey, setFieldKey] = useState('');
  const fieldOptions = useFieldOptions(fieldSource, fields, tagsQuery.data ?? []);

  const addMutation = useMutation({
    mutationFn: () =>
      templatesApi.addField(template.id, {
        field_source: fieldSource,
        field_key: fieldKey,
        sort_order: fields.length + 1,
        is_readonly: template.kind !== 'filter' && fieldSource !== 'tag',
      }),
    onSuccess: () => {
      onChanged();
      toast.success('已添加字段');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message || '添加失败'),
  });

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="absolute left-1/2 top-1/2 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-background-secondary p-5">
        <h3 className="mb-4 text-lg font-heading">添加字段</h3>
        <label className="mb-1.5 block text-xs text-foreground-secondary">来源</label>
        <div className="mb-3">
          <MenuSelect
            value={fieldSource}
            options={FIELD_SOURCE_OPTIONS}
            onChange={(next) => {
              setFieldSource(next);
              setFieldKey('');
            }}
          />
        </div>
        <label className="mb-1.5 block text-xs text-foreground-secondary">字段</label>
        <div className="mb-5">
          <MenuSelect
            value={fieldKey}
            options={fieldOptions}
            searchable
            placeholder={
              tagsQuery.isLoading && fieldSource === 'tag'
                ? '加载标签…'
                : fieldOptions.length
                  ? `搜索${fieldSource === 'tag' ? '标签' : '字段'}名称或 key`
                  : '没有可添加的字段'
            }
            disabled={tagsQuery.isLoading || !fieldOptions.length}
            onChange={setFieldKey}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!fieldKey || addMutation.isPending}
            className="h-10 rounded-full bg-primary px-4 text-sm text-primary-foreground disabled:opacity-50"
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending ? '添加中…' : '添加'}
          </button>
          <button
            type="button"
            className="h-10 px-4 text-sm text-foreground-secondary"
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

function useFieldOptions(
  source: string,
  fields: TemplateField[],
  tags: TagDefinition[],
) {
  return useMemo(() => {
    const used = new Set(fields.map((field) => `${field.field_source}:${field.field_key}`));
    if (source === 'asset') {
      return ASSET_FIELD_OPTIONS.filter((item) => !used.has(`asset:${item.value}`));
    }
    if (source === 'relation') {
      return RELATION_FIELD_OPTIONS.filter((item) => !used.has(`relation:${item.value}`));
    }
    return tags
      .filter((tag) => !used.has(`tag:${tag.tag_key}`))
      .map((tag) => ({
        value: tag.tag_key,
        label: tag.tag_name,
        hint: tag.tag_key,
      }));
  }, [source, fields, tags]);
}

function CreateTemplateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('detail');
  const [assetType, setAssetType] = useState('image');

  const mutation = useMutation({
    mutationFn: () =>
      templatesApi.create({
        code: code.trim(),
        name: name.trim(),
        kind: kind as Template['kind'],
        asset_type: kind === 'filter' || kind === 'card' ? null : assetType,
        is_default: false,
      }),
    onSuccess: (item) => {
      toast.success('模板已创建');
      onCreated(item.id);
    },
    onError: (err: Error) => toast.error(err.message || '创建失败'),
  });

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="关闭" />
      <div className="absolute left-1/2 top-1/2 w-[min(420px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background-secondary border border-white/10 p-5">
        <h3 className="text-lg font-heading mb-4">新建模板</h3>
        <input className={`${inputClass} mb-3`} placeholder="名称" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${inputClass} mb-3`} placeholder="code，如 summer_detail" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="mb-3">
          <MenuSelect
            value={kind}
            options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))}
            onChange={setKind}
          />
        </div>
        {kind !== 'filter' && kind !== 'card' && (
          <div className="mb-4">
            <MenuSelect
              value={assetType}
              options={ASSET_TYPE_OPTIONS}
              onChange={setAssetType}
            />
          </div>
        )}
        <div className="flex gap-2">
          <button type="button" className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm" onClick={() => mutation.mutate()}>
            创建
          </button>
          <button type="button" className="h-10 px-4 text-sm text-foreground-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}

const inputClass = 'h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-sm';
