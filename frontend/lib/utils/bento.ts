/**
 * 根据图片宽高比和位置计算卡片尺寸
 */
export function calculateBentoSize(
  aspectRatio: 'horizontal' | 'vertical' | 'square',
  index: number,
  totalCount: number
): 'large' | 'medium' | 'small' {
  // 规则 1: 第一张固定为大卡片（仅当总数>=5时）
  if (index === 0 && totalCount >= 5) {
    return 'large';
  }

  // 规则 2: 根据宽高比分配尺寸
  switch (aspectRatio) {
    case 'horizontal':
      return 'medium';  // 横图：1x2
    case 'vertical':
      return 'large';   // 竖图：2x2
    case 'square':
    default:
      return 'small';   // 方图：1x1
  }
}

/**
 * 根据照片数量计算网格列数
 */
export function getGridColumns(count: number): string {
  if (count === 1) return 'grid-cols-1';       // 1张：1列
  if (count === 2) return 'grid-cols-2';       // 2张：2列
  if (count <= 4) return 'grid-cols-2';        // 3-4张：2列
  return 'grid-cols-3';                        // 5-9张：3列
}
