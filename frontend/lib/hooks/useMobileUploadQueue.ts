'use client';

import { useCallback, useRef, useState } from 'react';
import { ingestionApi, type AlbumAssociationResult, type AlbumTarget } from '@/lib/api/ingestion';

const SIGNATURE_STORAGE_KEY = 'lumiharbor:uploaded-signatures';
const SIGNATURE_STORAGE_LIMIT = 2000;

export type UploadItemStatus = 'pending' | 'uploading' | 'success' | 'skipped' | 'failed';

export interface UploadItem {
  id: string;
  file: File;
  signature: string;
  status: UploadItemStatus;
  progress: number;
  error?: string;
}

export interface UploadQueueSummary {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  pending: number;
}

/** 用文件名+大小+最后修改时间拼一个启发式签名，用于跨会话识别“已经上传过” */
function buildSignature(file: File): string {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

function readUploadedSignatures(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(SIGNATURE_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function rememberUploadedSignature(signature: string): void {
  if (typeof window === 'undefined') return;
  try {
    const next = [...readUploadedSignatures(), signature].slice(-SIGNATURE_STORAGE_LIMIT);
    localStorage.setItem(SIGNATURE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可用/空间不足时忽略缓存；服务端哈希去重仍会兜底，不会产生重复素材
  }
}

/**
 * 移动端上传队列：签名去重跳过、逐文件串行上传、失败不中断、只重传失败项、
 * 新建相册只在第一次成功后锁定 album_id（避免重试导致重复建相册）。
 */
export function useMobileUploadQueue() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [albumResult, setAlbumResult] = useState<AlbumAssociationResult | null>(null);
  const resolvedAlbumTargetRef = useRef<AlbumTarget | null>(null);

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const addFiles = useCallback((files: File[]) => {
    const uploadedSignatures = readUploadedSignatures();
    const newItems: UploadItem[] = files.map((file, index) => {
      const signature = buildSignature(file);
      const alreadyUploaded = uploadedSignatures.has(signature);
      return {
        id: `${signature}_${Date.now()}_${index}`,
        file,
        signature,
        status: alreadyUploaded ? 'skipped' : 'pending',
        progress: alreadyUploaded ? 100 : 0,
      };
    });
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setAlbumResult(null);
    resolvedAlbumTargetRef.current = null;
  }, []);

  const uploadOne = useCallback(async (item: UploadItem, albumTarget: AlbumTarget) => {
    updateItem(item.id, { status: 'uploading', progress: 0, error: undefined });
    try {
      const response = await ingestionApi.uploadSingleAsset(item.file, {
        album: albumTarget,
        onProgress: (percent) => updateItem(item.id, { progress: percent }),
      });
      if (response.album) {
        setAlbumResult(response.album);
        // 第一次成功建相册后，后续文件与失败重试统一改用“已有相册”，避免重复创建同名相册
        resolvedAlbumTargetRef.current = { mode: 'existing', albumId: response.album.album_id };
      }
      rememberUploadedSignature(item.signature);
      updateItem(item.id, { status: 'success', progress: 100 });
    } catch (error) {
      const message = error instanceof Error ? error.message : '上传失败，请检查网络后重试';
      updateItem(item.id, { status: 'failed', progress: 0, error: message });
    }
  }, [updateItem]);

  const runQueue = useCallback(async (targetItems: UploadItem[], fallbackAlbumTarget: AlbumTarget) => {
    if (targetItems.length === 0 || isUploading) return;
    setIsUploading(true);
    if (!resolvedAlbumTargetRef.current) {
      resolvedAlbumTargetRef.current = fallbackAlbumTarget;
    }
    try {
      for (const item of targetItems) {
        await uploadOne(item, resolvedAlbumTargetRef.current ?? fallbackAlbumTarget);
      }
    } finally {
      setIsUploading(false);
    }
  }, [isUploading, uploadOne]);

  const startUpload = useCallback((albumTarget: AlbumTarget) => {
    const pendingItems = items.filter((item) => item.status === 'pending');
    return runQueue(pendingItems, albumTarget);
  }, [items, runQueue]);

  const retryFailed = useCallback(() => {
    const failedItems = items.filter((item) => item.status === 'failed');
    return runQueue(failedItems, { mode: 'none' });
  }, [items, runQueue]);

  const summary: UploadQueueSummary = {
    total: items.length,
    success: items.filter((item) => item.status === 'success').length,
    skipped: items.filter((item) => item.status === 'skipped').length,
    failed: items.filter((item) => item.status === 'failed').length,
    pending: items.filter((item) => item.status === 'pending').length,
  };

  return {
    items,
    summary,
    isUploading,
    albumResult,
    addFiles,
    removeItem,
    reset,
    startUpload,
    retryFailed,
  };
}
