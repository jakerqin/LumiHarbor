const LOOPBACK_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)$/i;

/**
 * 解析素材媒体地址。
 * 后端默认返回相对路径 `/media/...`，由 next.config 的 rewrites 转给后端，任何主机访问都可用；
 * 旧配置返回的 `http://localhost:8000/media/...` 在手机上会指向手机自己，这里改回相对路径。
 */
export function resolveMediaUrl(url?: string | null, path?: string | null): string | null {
  const cleanedUrl = url?.trim();
  if (cleanedUrl) return cleanedUrl.replace(LOOPBACK_URL, '$3');

  const cleanedPath = path?.trim();
  if (!cleanedPath) return null;
  if (/^https?:\/\//i.test(cleanedPath)) return cleanedPath;

  // *_path 是相对 NAS_DATA_PATH 的路径，对应后端静态挂载 /media
  return `/media/${cleanedPath.replace(/^\/+/, '')}`;
}
