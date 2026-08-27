'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { FaceGrid } from '@/components/faces/FaceGrid';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { subjectsApi } from '@/lib/api/subjects';
import { EmptyState } from '@/components/common/EmptyState';

export const dynamic = 'force-dynamic';

export default function SubjectDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const subjectId = Number(params.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => subjectsApi.get(subjectId),
    enabled: Number.isFinite(subjectId),
  });

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => router.push('/faces')}
        className="mb-6 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <ArrowLeft size={18} />
        返回
      </button>
      {isLoading ? (
        <div className="mb-8">
          <div className="h-9 w-40 rounded-xl bg-background-secondary animate-pulse mb-2" />
          <div className="h-5 w-24 rounded bg-background-secondary animate-pulse" />
        </div>
      ) : isError || !data ? (
        <EmptyState title="成员不存在" action={{ label: '返回', href: '/faces' }} />
      ) : (
        <>
          <PageHeader
            title={data.name}
            description={`${data.face_count} 张匹配`}
            actions={
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-red-500/10 border border-white/10 inline-flex items-center justify-center text-red-400 transition-colors"
                aria-label={`删除 ${data.name}`}
              >
                <Trash2 size={18} />
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-foreground">
                  删除成员
                </span>
              </button>
            }
          />
          <FaceGrid
            key={subjectId}
            subjectId={subjectId}
            emptyTitle="还没有匹配上的照片"
            emptyDescription="导入新图或点「补算面孔」后，对得上的脸会出现在这里。"
            onFaceClick={(face) => router.push(`/assets/${face.asset_id}`)}
          />
          <ConfirmDialog
            open={confirmOpen}
            title={`删除 ${data.name}？`}
            description="会从名单里去掉，已匹配的照片裁剪也会一并删掉。素材本身不受影响。"
            confirmText="删除"
            confirmTone="danger"
            loading={deleting}
            onConfirm={async () => {
              if (deleting) return;
              setDeleting(true);
              try {
                await subjectsApi.remove(data.id);
                await queryClient.invalidateQueries({ queryKey: ['subjects'] });
                toast.success(`已删除 ${data.name}`);
                router.push('/faces');
              } catch (error) {
                console.error(error);
                toast.error('删除失败，请稍后重试');
                setDeleting(false);
              }
            }}
            onCancel={() => setConfirmOpen(false)}
          />
        </>
      )}
    </PageShell>
  );
}
