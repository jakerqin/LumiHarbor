import { resolveApiBaseUrl } from '@/lib/api/baseUrl';

export function resolveMediaUrl(url?: string | null, path?: string | null): string | null {
  const cleanedUrl = url?.trim();
  if (cleanedUrl) return cleanedUrl;

  const cleanedPath = path?.trim();
  if (!cleanedPath) return null;
  if (/^https?:\/\//i.test(cleanedPath)) return cleanedPath;

  const baseUrl = resolveApiBaseUrl().replace(/\/$/, '');
  const normalizedPath = cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`;
  return `${baseUrl}${normalizedPath}`;
}

