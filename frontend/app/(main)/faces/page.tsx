'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { SubjectCard } from '@/components/faces/SubjectCard';
import { AddSubjectModal, type AddSubjectPayload } from '@/components/faces/AddSubjectModal';
import { ScanHistoryModal } from '@/components/faces/ScanHistoryModal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { subjectsApi, type Subject } from '@/lib/api/subjects';

export const dynamic = 'force-dynamic';

export default function FacesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [scanName, setScanName] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.list(),
  });

  const subjects = data?.subjects ?? [];

  const handleAdd = async (payload: AddSubjectPayload) => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await subjectsApi.create(payload);
      await subjectsApi.uploadRef(created.id, payload.file, payload.bbox);
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setOpen(false);
      setScanName(created.name);
      toast.success('已登记，导入新图时会自动匹配');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : '添加失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!pending || deleting) return;
    setDeleting(true);
    try {
      await subjectsApi.remove(pending.id);
      await queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast.success(`已删除 ${pending.name}`);
      setPending(null);
    } catch (error) {
      console.error(error);
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="成员墙"
        description="浏览家里人出现过的照片"
        actions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative h-11 w-11 rounded-xl bg-background-secondary hover:bg-background-tertiary border border-white/10 inline-flex items-center justify-center transition-colors"
            aria-label="添加成员"
          >
            <UserPlus size={20} />
            <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-background-secondary border border-white/10 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              添加成员
            </span>
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square rounded-full bg-background-secondary animate-pulse mb-4" />
              <div className="h-5 w-24 rounded bg-background-secondary animate-pulse" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState title="加载失败" description="请刷新后重试。" />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="还没有成员"
          description="先添加家庭成员，并上传一张头像。"
          action={{ label: '添加成员', onClick: () => setOpen(true) }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onClick={() => router.push(`/faces/${subject.id}`)}
              onDelete={setPending}
            />
          ))}
        </div>
      )}

      <AddSubjectModal open={open} loading={saving} onClose={() => setOpen(false)} onSubmit={handleAdd} />
      <ScanHistoryModal
        open={scanName !== null}
        subjectName={scanName ?? ''}
        onDone={() => setScanName(null)}
      />
      <ConfirmDialog
        open={pending !== null}
        title={`删除 ${pending?.name ?? ''}？`}
        description="会从名单里去掉，已匹配的照片裁剪也会一并删掉。素材本身不受影响。"
        confirmText="删除"
        confirmTone="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPending(null)}
      />
    </PageShell>
  );
}
