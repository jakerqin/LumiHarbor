'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmTone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  confirmTone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmClassName = confirmTone === 'danger'
    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
    : 'bg-primary hover:bg-primary-hover text-white';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="关闭"
        onClick={loading ? undefined : onCancel}
      />

      <div className="absolute inset-0 flex items-start justify-center p-4 pt-24">
        <div className="w-full max-w-md rounded-2xl bg-background border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10">
            <h2 className="text-lg font-heading font-semibold">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-foreground-secondary">{description}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ${confirmClassName}`}
            >
              {loading ? '处理中...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
