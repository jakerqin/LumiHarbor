'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Asset } from '@/lib/api/types';
import type { TemplateField } from '@/lib/api/templates';
import { assetsApi } from '@/lib/api/assets';

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  const fixed = value >= 100 || index === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[index]}`;
}

function readAssetValue(asset: Asset, key: string): string {
  if (key === 'asset_type') {
    if (asset.asset_type === 'video') return '视频';
    if (asset.asset_type === 'audio') return '音频';
    return '图片';
  }
  if (key === 'file_size') return formatFileSize(asset.file_size);
  if (key === 'shot_at') return asset.shot_at || '-';
  if (key === 'created_at') return asset.created_at || '-';
  return '-';
}

export function AssetTemplateFields({
  asset,
  fields,
  tags,
}: {
  asset: Asset;
  fields: TemplateField[];
  tags: Record<string, string | null>;
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const assetFields = fields.filter((f) => f.field_source === 'asset');
    const tagFields = fields.filter((f) => f.field_source === 'tag');
    return { assetFields, tagFields };
  }, [fields]);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, string | null>) => assetsApi.upsertAssetTags(asset.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-tags', asset.id] });
      toast.success('标签已保存');
      setDrafts({});
    },
    onError: (err: Error) => toast.error(err.message || '保存失败'),
  });

  return (
    <div className="space-y-6">
      {grouped.assetFields.length > 0 && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {grouped.assetFields.map((field) => (
            <div key={`${field.field_source}-${field.field_key}`} className="space-y-1">
              <dt className="text-xs text-foreground-tertiary">{field.tag_name || field.field_key}</dt>
              <dd className="text-foreground break-words">{readAssetValue(asset, field.field_key)}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grouped.tagFields.map((field) => {
          const editable = field.tag_source === 'user' && !field.is_readonly;
          const current = drafts[field.field_key] ?? tags[field.field_key] ?? '';
          const options = readOptions(field);
          return (
            <div key={field.id} className="rounded-xl bg-background-tertiary border border-white/5 p-3">
              <p className="text-xs text-foreground-tertiary mb-1">{field.tag_name || field.field_key}</p>
              {editable && options.length > 0 ? (
                <select
                  className="w-full bg-transparent text-sm"
                  value={current}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                >
                  <option value="">未设置</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : editable ? (
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  value={current}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [field.field_key]: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-foreground break-words">{current || '-'}</p>
              )}
            </div>
          );
        })}
      </div>

      {Object.keys(drafts).length > 0 && (
        <button
          type="button"
          className="h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm"
          onClick={() => saveMutation.mutate(drafts)}
        >
          保存标签
        </button>
      )}
    </div>
  );
}

function readOptions(field: TemplateField): string[] {
  const extra = field.tag_extra_info || {};
  const options = extra.options;
  if (!Array.isArray(options)) return [];
  return options.map((opt) => (typeof opt === 'string' ? opt : String((opt as { value?: string }).value || '')));
}
