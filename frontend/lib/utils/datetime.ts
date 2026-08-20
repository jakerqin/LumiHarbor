/** ISO / 空格分隔的日期时间 → YYYY-MM-DD HH:MM:SS，不走 Date，避免时区与 hydration 分叉 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const match = value.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : value;
}
