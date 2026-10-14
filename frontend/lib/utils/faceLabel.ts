import type { Face } from '@/lib/api/faces';

/** 已匹配成员名优先，否则人 / 猫 / 狗 */
export function faceLabel(face: Pick<Face, 'subject_type' | 'species' | 'subject_name'>): string {
  if (face.subject_name) return face.subject_name;
  if (face.subject_type === 'human') return '人';
  if (face.species === 'cat') return '猫';
  if (face.species === 'dog') return '狗';
  return '动物';
}
