'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import { AssetMasonry } from '@/components/assets/AssetMasonry';
import { EmptyState } from '@/components/common/EmptyState';
import { MasonrySkeleton } from '@/components/common/MasonrySkeleton';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { trashApi, trashItemToAsset, type TrashItem } from '@/lib/api/trash';
import type { Asset } from '@/lib/api/types';
import { cn } from '@/lib/utils/cn';

// 剩余天数不超过这个值时角标标红
const EXPIRING_SOON_DAYS = 7;

export const dynamic = 'force-dynamic';

function CornerBadge({ item }: { item: TrashItem }) {
  if (!item.restorable) {
    return <span className="h-7 px-2.5 rounded-full bg-black/45 backdrop-blur-sm text-xs text-white/80 inline-flex items-center whitespace-nowrap">已重新导入</span>;
  }
  if (item.days_left === null) return <></>;
  const soon = item.days_left <= EXPIRING_SOON_DAYS;
  return (
    <span
      className={cn(
        'h-7 px-2.5 rounded-full backdrop-blur-sm text-xs inline-flex items-center tabular-nums whitespace-nowrap',
        soon ? 'bg-red-500/25 text-red-200' : 'bg-black/35 text-white'
      )}
    >
      {item.days_left === 0 ? (
        '今天删除'
      ) : (
        <>
          <span className="hidden sm:inline">剩&nbsp;</span>
          {item.days_left}
          <span className="hidden sm:inline">&nbsp;</span>天
        </>
      )}
    </span>
  );
}

function RestoreBar({
  count,
  restoring,
  onRestore,
  onClear,
}: {
  count: number;
  restoring: boolean;
  onRestore: () => void;
  onClear: () => void;
}) {
  return (
    <div className="fixed left-1/2 bottom-24 md:bottom-10 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-background-secondary/80 backdrop-blur-lg border border-white/10 shadow-2xl">
        <div className="text-sm text-foreground-secondary px-3 whitespace-nowrap">
          已选择 <span className="text-foreground font-medium">{count}</span> 项
        </div>
        <div className="h-6 w-px bg-white/10" />
        <button
          type="button"
          onClick={onRestore}
          disabled={restoring}
          className="h-10 px-4 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary inline-flex items-center gap-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <RotateCcw size={16} />
          {restoring ? '恢复中...' : '恢复'}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="h-10 w-10 rounded-lg bg-background-tertiary hover:bg-white/10 inline-flex items-center justify-center transition-colors"
          aria-label="取消选择"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

/** 回收站数据 + 选择 + 恢复 */
function useTrash() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const query = useQuery({ queryKey: ['trash'], queryFn: trashApi.list });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const restorableIds = useMemo(() => items.filter((i) => i.restorable).map((i) => i.id), [items]);
  const allSelected = restorableIds.length > 0 && restorableIds.every((id) => selectedIds.has(id));

  const restoreMutation = useMutation({
    mutationFn: (ids: number[]) => trashApi.restore(ids),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedIds(new Set());
      if (result.restored.length > 0) toast.success(`已恢复 ${result.restored.length} 个素材`);
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} 个未能恢复：${result.failed[0].reason}`);
      }
    },
    onError: () => toast.error('恢复失败，请稍后重试'),
  });

  const toggle = (asset: Asset) => {
    const item = itemById.get(asset.id);
    if (item && !item.restorable) {
      toast.info(item.reason ?? '这个素材无法恢复');
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) next.delete(asset.id);
      else next.add(asset.id);
      return next;
    });
  };
  const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(restorableIds));

  return { query, items, itemById, selectedIds, setSelectedIds, allSelected, restorableIds, restoreMutation, toggle, toggleAll };
}

export default function TrashPage() {
  const { query, items, itemById, selectedIds, setSelectedIds, allSelected, restorableIds, restoreMutation, toggle, toggleAll } = useTrash();
  const { data, isLoading, error } = query;
  const assets = useMemo(() => items.map(trashItemToAsset), [items]);

  const retentionDays = data?.retention_days ?? 0;
  const description = retentionDays > 0
    ? `删除的素材会在这里保留 ${retentionDays} 天，到期后自动彻底删除。点选素材后可恢复。`
    : '删除的素材会一直保留在这里，点选素材后可恢复。';

  return (
    <PageShell>
      <PageHeader
        title="回收站"
        description={description}
        actions={
          <Link
            href="/assets"
            className="h-10 px-4 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center gap-2 text-sm transition-colors"
          >
            <ArrowLeft size={16} />
            素材库
          </Link>
        }
      />

      {items.length > 0 && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground-secondary">共 {items.length} 个素材</p>
          <button
            type="button"
            onClick={toggleAll}
            disabled={restorableIds.length === 0}
            className="px-4 h-10 inline-flex items-center rounded-full text-sm border transition-colors bg-white/5 text-foreground-secondary border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>
      )}

      {isLoading ? (
        <MasonrySkeleton count={8} />
      ) : error ? (
        <EmptyState
          title="加载失败"
          description="请检查网络后刷新页面重试。"
          action={{ label: '刷新', onClick: () => window.location.reload() }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="回收站是空的"
          description="在素材库里删除的素材会先放到这里，到期前都可以恢复。"
          action={{ label: '回到素材库', href: '/assets' }}
        />
      ) : (
        <AssetMasonry
          assets={assets}
          selectionMode
          selectedAssetIds={selectedIds}
          onSelectionToggle={toggle}
          disableHoverEffects
          renderCornerBadge={(asset) => {
            const item = itemById.get(asset.id);
            return item ? <CornerBadge item={item} /> : null;
          }}
        />
      )}

      {selectedIds.size > 0 && (
        <RestoreBar
          count={selectedIds.size}
          restoring={restoreMutation.isPending}
          onRestore={() => restoreMutation.mutate(Array.from(selectedIds))}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </PageShell>
  );
}
