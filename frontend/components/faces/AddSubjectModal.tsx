'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  subjectsApi,
  type FaceCandidate,
  type PetSpecies,
  type SubjectKind,
} from '@/lib/api/subjects';
import { FacePickPreview } from './FacePickPreview';

export interface AddSubjectPayload {
  name: string;
  kind: SubjectKind;
  species?: PetSpecies;
  file: File;
  bbox: { bbox_x: number; bbox_y: number; bbox_w: number; bbox_h: number };
}

interface AddSubjectModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: AddSubjectPayload) => void;
}

type FaceRole = 'human' | 'cat' | 'dog';

function roleFromFace(item: FaceCandidate): FaceRole {
  if (item.subject_type === 'human') return 'human';
  return item.species === 'dog' ? 'dog' : 'cat';
}

export function AddSubjectModal({ open, loading, onClose, onSubmit }: AddSubjectModalProps) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<FaceCandidate[]>([]);
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [role, setRole] = useState<FaceRole | null>(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setName('');
    setFile(undefined);
    setPreview(null);
    setBoxes([]);
    setPickedIndex(null);
    setRole(null);
    setDetecting(false);
  }, [open]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const picked = pickedIndex != null ? boxes[pickedIndex] : null;

  if (!open) return null;

  const chooseFile = async (next?: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setBoxes([]);
    setPickedIndex(null);
    setRole(null);
    setPreview(next ? URL.createObjectURL(next) : null);
    if (!next) return;
    setDetecting(true);
    try {
      const found = await subjectsApi.detectUpload(next);
      setBoxes(found);
      setPickedIndex(found.length === 1 ? 0 : null);
      setRole(found.length === 1 ? roleFromFace(found[0]) : null);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : '检脸失败，请稍后重试');
      setFile(undefined);
      setPreview(null);
    } finally {
      setDetecting(false);
    }
  };

  const canSave = Boolean(name.trim() && file && picked && role && !detecting);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background-secondary/95 backdrop-blur-xl border border-white/10 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave || !file || !picked || !role) return;
          onSubmit({
            name: name.trim(),
            file,
            bbox: {
              bbox_x: picked.bbox_x,
              bbox_y: picked.bbox_y,
              bbox_w: picked.bbox_w,
              bbox_h: picked.bbox_h,
            },
            kind: role === 'human' ? 'human' : 'pet',
            species: role === 'human' ? undefined : role,
          });
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-xl font-semibold">添加成员</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              名字 <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="妈妈 / 小白"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              头像 <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              accept="image/*"
              className="w-full text-sm text-foreground-secondary file:mr-3 file:px-3 file:py-2 file:rounded-xl file:border-0 file:bg-white/10 file:text-foreground file:text-sm"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
          </div>

          {detecting && <p className="text-sm text-foreground-secondary">正在检脸…</p>}
          {preview && !detecting && (
            <div>
              {boxes.length === 0 ? (
                <p className="text-sm text-foreground-secondary mb-2">
                  这张图上没有对得上的人脸或猫狗脸，换一张。
                </p>
              ) : (
                <p className="text-sm text-foreground-secondary mb-2">
                  检出 {boxes.length} 张。点选后可拖动或拉角，预览会完整显示框内内容。
                </p>
              )}
              <FacePickPreview
                src={preview}
                boxes={boxes}
                pickedIndex={pickedIndex}
                onPick={(index) => {
                  setPickedIndex(index);
                  setRole(roleFromFace(boxes[index]));
                }}
                onAdjust={(index, next) =>
                  setBoxes((prev) => prev.map((item, i) => (i === index ? next : item)))
                }
              />
              {picked && role && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">物种</p>
                  <div className="flex items-center gap-1 p-1 bg-background-tertiary rounded-xl w-fit">
                    {([
                      ['human', '人'],
                      ['cat', '猫'],
                      ['dog', '狗'],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setRole(id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          role === id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-foreground-secondary hover:bg-white/5'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading || !canSave}
            className="px-6 py-2.5 rounded-xl text-sm bg-primary hover:bg-primary-hover text-primary-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登记中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
