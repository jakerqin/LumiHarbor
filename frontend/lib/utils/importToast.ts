import { toast } from 'sonner';
import type { UploadTally } from '@/lib/api/ingestion';

/** 多文件上传 / 导入结束后的汇总提示（素材页上传、相册文件夹导入共用） */
export function notifyImportResult(result: UploadTally): void {
  const { imported, skipped, failed } = result;
  const parts = [`导入成功 ${imported} 个`];
  if (skipped) parts.push(`已存在 ${skipped} 个`);
  if (failed) parts.push(`失败 ${failed} 个`);
  const toastFn = !imported && !skipped ? toast.error : !imported ? toast.warning : toast.success;
  toastFn(!imported && !skipped && !failed ? '导入失败，请稍后重试' : parts.join('，'));
}
