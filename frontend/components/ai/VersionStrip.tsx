'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Layers, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { aiImageApi, type AssetVersion } from '@/lib/api/aiImage';
import { cn } from '@/lib/utils/cn';
import { resolveMediaUrl } from '@/lib/utils/mediaUrl';

interface VersionStripProps {
  assetId: number;
}

/** 详情页主图下方的版本条：原图 + AI 修图版本，点击切换当前显示；只有一个版本（没修过）时不显示 */
export function VersionStrip({ assetId }: VersionStripProps) {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<AssetVersion | null>(null);
  const { data } = useQuery({
    queryKey: ['asset-versions', assetId],
    queryFn: () => aiImageApi.getVersions(assetId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
    queryClient.invalidateQueries({ queryKey: ['asset-versions', assetId] });
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };
  const switchMutation = useMutation({
    mutationFn: (version: AssetVersion) =>
      aiImageApi.setCurrentVersion(assetId, version.kind === 'original' ? null : version.id),
    onSuccess: refresh,
    onError: () => toast.error('切换失败'),
  });
  const deleteMutation = useMutation({
    mutationFn: (version: AssetVersion) => aiImageApi.deleteVersion(assetId, version.id),
    onSuccess: () => { refresh(); setPendingDelete(null); },
    onError: () => toast.error('删除失败'),
  });

  const versions = data?.versions ?? [];
  if (versions.length <= 1) return null;
  const current = versions.find((v) => v.is_current);
  const currentImage = current?.kind === 'ai_edit' ? resolveMediaUrl(current.image_url) : null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 text-sm text-foreground-secondary">
          <Layers size={16} />
          <span>版本</span>
          <span className="text-xs text-foreground-tertiary">点击切换显示，原图始终保留</span>
        </div>
        {currentImage && (
          <a href={currentImage} download className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary hover:text-foreground">
            <Download size={14} />
            下载当前版本
          </a>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {versions.map((version, index) => (
          <div key={version.id} className="relative shrink-0 group">
            <button
              type="button"
              onClick={() => !version.is_current && switchMutation.mutate(version)}
              disabled={switchMutation.isPending}
              className={cn(
                'block w-20 rounded-xl overflow-hidden border-2 transition-colors',
                version.is_current ? 'border-primary' : 'border-transparent hover:border-white/30'
              )}
            >
              <img src={resolveMediaUrl(version.thumbnail_url) || '/icon.svg'} alt="" className="w-20 h-20 object-cover" />
              <span className="block py-1 text-xs text-center bg-background-secondary text-foreground-secondary">
                {version.kind === 'original' ? '原图' : `AI ${index}`}
              </span>
            </button>
            {version.kind === 'ai_edit' && (
              <button
                type="button"
                onClick={() => setPendingDelete(version)}
                aria-label="删除这个版本"
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <Trash2 size={12} className="text-red-300" />
              </button>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除这个版本"
        description="删除后无法找回（原图不受影响）。如果它正在显示，会切回原图。"
        confirmText="删除"
        confirmTone="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
