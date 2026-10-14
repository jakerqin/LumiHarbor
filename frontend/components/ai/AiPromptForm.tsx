'use client';

import type { AiPreset, AiTier } from '@/lib/api/aiImage';
import { cn } from '@/lib/utils/cn';

export interface AiPromptValue {
  presetCode: string | null;
  prompt: string;
  tier: AiTier;
}

interface AiPromptFormProps {
  presets: AiPreset[];
  value: AiPromptValue;
  onChange: (value: AiPromptValue) => void;
  /** 没选预设时输入框的提示 */
  freePlaceholder: string;
  disabled?: boolean;
}

const TIERS: { value: AiTier; label: string; hint: string }[] = [
  { value: 'standard', label: '标准', hint: '更快、更省' },
  { value: 'hq', label: '精细', hint: '细节更好，更慢更贵' },
];

/** 预设 + 补充描述 + 标准/精细；修图面板和 AI 创作页共用 */
export function AiPromptForm({ presets, value, onChange, freePlaceholder, disabled }: AiPromptFormProps) {
  const selected = presets.find((p) => p.code === value.presetCode) ?? null;

  const pickPreset = (preset: AiPreset) => {
    const unselect = value.presetCode === preset.code;
    onChange({
      ...value,
      presetCode: unselect ? null : preset.code,
      // 推荐精细档的预设（老照片修复等）选中时顺手切到精细
      tier: !unselect && preset.hq ? 'hq' : value.tier,
    });
  };

  return (
    <fieldset disabled={disabled} className="space-y-5 disabled:opacity-60">
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.code}
            type="button"
            onClick={() => pickPreset(preset)}
            title={preset.description}
            className={cn(
              'px-3.5 h-9 inline-flex items-center rounded-full text-sm border transition-colors',
              value.presetCode === preset.code
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-white/5 text-foreground-secondary border-white/10 hover:bg-white/10'
            )}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {selected && <p className="text-xs text-foreground-tertiary">{selected.description}</p>}
        <textarea
          value={value.prompt}
          onChange={(e) => onChange({ ...value, prompt: e.target.value })}
          rows={3}
          maxLength={2000}
          placeholder={
            selected
              ? selected.needs_input
                ? '必填：' + selected.description
                : '可选：补充要求，例如「整体再暖一点」'
              : freePlaceholder
          }
          className="w-full rounded-xl bg-background-secondary border border-white/10 px-3.5 py-3 text-sm placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        {TIERS.map((tier) => (
          <button
            key={tier.value}
            type="button"
            onClick={() => onChange({ ...value, tier: tier.value })}
            className={cn(
              'px-3 h-8 inline-flex items-center gap-1.5 rounded-lg text-sm border transition-colors',
              value.tier === tier.value
                ? 'bg-white/10 text-foreground border-white/20'
                : 'text-foreground-secondary border-transparent hover:bg-white/5'
            )}
          >
            {tier.label}
            <span className="text-xs text-foreground-tertiary hidden sm:inline">{tier.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** 当前输入能否提交（与后端 build_prompt 的校验一致） */
export function canSubmitPrompt(presets: AiPreset[], value: AiPromptValue): boolean {
  const text = value.prompt.trim();
  const preset = presets.find((p) => p.code === value.presetCode);
  if (preset) return !preset.needs_input || text.length > 0;
  return text.length > 0;
}
