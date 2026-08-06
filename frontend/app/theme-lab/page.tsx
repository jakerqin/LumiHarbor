'use client';

import { useState } from 'react';
import Link from 'next/link';

type SchemeId = 'A' | 'B' | 'C' | 'D' | 'E';

interface Scheme {
  id: SchemeId;
  name: string;
  vibe: string;
  primary: string;
  primaryFg: string;
  primaryHover: string;
  bg: string;
  bgSecondary: string;
  bgTertiary: string;
  fg: string;
  fgSecondary: string;
  fgTertiary: string;
  border: string;
  destructive: string;
}

const SCHEMES: Scheme[] = [
  {
    id: 'A',
    name: '暖琥珀',
    vibe: '黄昏 / 胶片 / 港湾暖光（当前线上）',
    primary: '#c9955a',
    primaryFg: '#1a1410',
    primaryHover: '#b8844a',
    bg: '#12100e',
    bgSecondary: '#1a1714',
    bgTertiary: '#2a241e',
    fg: '#f3eee6',
    fgSecondary: '#a89f91',
    fgTertiary: '#7a7268',
    border: 'rgba(243, 232, 216, 0.12)',
    destructive: '#c45c4a',
  },
  {
    id: 'B',
    name: '雾青绿',
    vibe: '安静档案 / 森林与海边空气',
    primary: '#6b9e8e',
    primaryFg: '#0f1614',
    primaryHover: '#5a8a7b',
    bg: '#0c1012',
    bgSecondary: '#141a1c',
    bgTertiary: '#1e282b',
    fg: '#e8eef0',
    fgSecondary: '#8f9ea3',
    fgTertiary: '#66747a',
    border: 'rgba(232, 238, 240, 0.12)',
    destructive: '#c45c4a',
  },
  {
    id: 'C',
    name: '铜锈棕',
    vibe: '更沉、偏印刷与旧物',
    primary: '#b07a5a',
    primaryFg: '#1a120e',
    primaryHover: '#9a684a',
    bg: '#0f0e0c',
    bgSecondary: '#181614',
    bgTertiary: '#28241f',
    fg: '#f0ebe3',
    fgSecondary: '#9e9488',
    fgTertiary: '#72685c',
    border: 'rgba(240, 235, 227, 0.12)',
    destructive: '#c45c4a',
  },
  {
    id: 'D',
    name: '雾蓝灰',
    vibe: '克制相册感（非亮蓝紫）',
    primary: '#7a8fa3',
    primaryFg: '#0e1216',
    primaryHover: '#687c8f',
    bg: '#0d1014',
    bgSecondary: '#151a20',
    bgTertiary: '#222a33',
    fg: '#e8edf2',
    fgSecondary: '#8f9aab',
    fgTertiary: '#667182',
    border: 'rgba(232, 237, 242, 0.12)',
    destructive: '#c45c4a',
  },
  {
    id: 'E',
    name: '暖米金',
    vibe: '更柔的家居感（对比略弱）',
    primary: '#d4b483',
    primaryFg: '#1a1610',
    primaryHover: '#c4a372',
    bg: '#16140f',
    bgSecondary: '#1f1c16',
    bgTertiary: '#2e2a22',
    fg: '#f5f0e6',
    fgSecondary: '#b0a693',
    fgTertiary: '#857a68',
    border: 'rgba(245, 240, 230, 0.12)',
    destructive: '#c45c4a',
  },
];

function SwatchRow({ scheme }: { scheme: Scheme }) {
  const chips = [
    { label: 'bg', color: scheme.bg },
    { label: 'sec', color: scheme.bgSecondary },
    { label: 'ter', color: scheme.bgTertiary },
    { label: 'pri', color: scheme.primary },
    { label: 'fg', color: scheme.fg },
  ];
  return (
    <div className="flex gap-1.5">
      {chips.map((c) => (
        <div
          key={c.label}
          title={`${c.label} ${c.color}`}
          className="h-7 flex-1 rounded-md border border-white/10"
          style={{ background: c.color }}
        />
      ))}
    </div>
  );
}

function UiMock({ scheme }: { scheme: Scheme }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border h-full min-h-[420px] flex flex-col"
      style={{
        background: scheme.bg,
        color: scheme.fg,
        borderColor: scheme.border,
        fontFamily: 'var(--font-noto-sans-sc), system-ui, sans-serif',
      }}
    >
      {/* 迷你英雄区 */}
      <div className="px-6 pt-7 pb-5" style={{ background: scheme.bgSecondary }}>
        <p
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{
            color: scheme.primary,
            fontFamily: 'var(--font-space-grotesk), sans-serif',
          }}
        >
          拾光坞
        </p>
        <p className="text-sm leading-relaxed" style={{ color: scheme.fgSecondary }}>
          光影流转，岁月留痕
        </p>
      </div>

      <div className="px-6 py-5 flex-1 flex flex-col gap-5">
        {/* 页头 */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              className="text-xl font-semibold mb-1"
              style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
            >
              素材库
            </h2>
            <p className="text-xs" style={{ color: scheme.fgSecondary }}>
              浏览和管理所有照片、视频素材
            </p>
          </div>
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: scheme.primary, color: scheme.primaryFg }}
          >
            上传
          </button>
        </div>

        {/* 假瀑布流卡片 */}
        <div className="grid grid-cols-3 gap-2">
          {[48, 72, 56].map((h, i) => (
            <div
              key={i}
              className="rounded-lg"
              style={{
                height: h,
                background: scheme.bgTertiary,
                border: `1px solid ${scheme.border}`,
              }}
            />
          ))}
        </div>

        {/* 状态条 */}
        <div
          className="rounded-xl px-3 py-2.5 flex items-center justify-between text-xs"
          style={{
            background: `color-mix(in srgb, ${scheme.fg} 6%, transparent)`,
            border: `1px solid ${scheme.border}`,
          }}
        >
          <span style={{ color: scheme.fgSecondary }}>已选择 3 项</span>
          <span style={{ color: scheme.destructive }}>删除</span>
        </div>

        {/* Dock 激活态示意 */}
        <div className="mt-auto flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-medium"
            style={{
              background: scheme.primary,
              color: scheme.primaryFg,
              boxShadow: `0 8px 20px color-mix(in srgb, ${scheme.primary} 28%, transparent)`,
            }}
          >
            素材
          </div>
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-[10px]"
            style={{
              color: scheme.fgTertiary,
              background: 'transparent',
              border: `1px solid ${scheme.border}`,
            }}
          >
            相册
          </div>
          <div
            className="ml-auto w-1 h-5 rounded-l-full"
            style={{
              background: scheme.primary,
              boxShadow: `0 0 12px color-mix(in srgb, ${scheme.primary} 35%, transparent)`,
            }}
          />
        </div>

        <p className="text-[10px] tabular-nums" style={{ color: scheme.fgTertiary }}>
          primary {scheme.primary} · bg {scheme.bg}
        </p>
      </div>
    </div>
  );
}

export default function ThemeLabPage() {
  const [active, setActive] = useState<SchemeId>('E');
  const current = SCHEMES.find((s) => s.id === active)!;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0ebe3] px-4 py-8 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-2xl font-semibold tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-space-grotesk), sans-serif' }}
            >
              配色实验室
            </h1>
            <p className="text-sm text-[#a89f91] max-w-xl">
              五套「单品牌色 + 同色相灰阶」小样对比。点选方案看大预览；不会改正式主题，选定后再告诉我落地哪一套。
            </p>
          </div>
          <Link
            href="/"
            className="text-sm px-3 py-1.5 rounded-lg border border-white/10 text-[#a89f91] hover:text-[#f0ebe3] hover:bg-white/5 transition-colors"
          >
            返回首页
          </Link>
        </div>

        {/* 方案选择 */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-8">
          {SCHEMES.map((s) => {
            const selected = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className="text-left rounded-xl p-3 border transition-colors"
                style={{
                  background: selected ? s.bgSecondary : '#141414',
                  borderColor: selected ? s.primary : 'rgba(255,255,255,0.1)',
                  boxShadow: selected
                    ? `inset 0 0 0 1px ${s.primary}`
                    : undefined,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: s.fg }}>
                    {s.id}. {s.name}
                  </span>
                  {s.id === 'E' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#a89f91]">
                      当前
                    </span>
                  )}
                </div>
                <p className="text-[11px] mb-3 leading-snug" style={{ color: s.fgSecondary }}>
                  {s.vibe}
                </p>
                <SwatchRow scheme={s} />
              </button>
            );
          })}
        </div>

        {/* 大预览 + 五列缩略 */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 mb-10">
          <div>
            <p className="text-xs text-[#7a7268] mb-3">
              大预览 · 方案 {current.id} {current.name}
            </p>
            <UiMock scheme={current} />
          </div>
          <div>
            <p className="text-xs text-[#7a7268] mb-3">五套并排（缩略）</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {SCHEMES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  className="text-left rounded-xl overflow-hidden border transition-opacity"
                  style={{
                    borderColor: s.id === active ? s.primary : 'rgba(255,255,255,0.08)',
                    opacity: s.id === active ? 1 : 0.72,
                  }}
                >
                  <div className="px-2 py-1.5 text-[10px]" style={{ background: s.bg, color: s.fgSecondary }}>
                    {s.id} {s.name}
                  </div>
                  <div className="h-16 flex" style={{ background: s.bgSecondary }}>
                    <div className="w-1/3" style={{ background: s.bgTertiary }} />
                    <div className="flex-1 flex items-center justify-center">
                      <div
                        className="w-8 h-8 rounded-lg"
                        style={{ background: s.primary }}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div
              className="mt-6 rounded-xl border border-white/10 p-4 text-sm space-y-2"
              style={{ background: '#141414' }}
            >
              <p className="text-[#a89f91]">怎么选（简记）</p>
              <ul className="text-xs text-[#7a7268] space-y-1.5 list-disc pl-4">
                <li>A 暖琥珀：最贴「拾光」，偏黄昏胶片</li>
                <li>B 雾青绿：更冷静、档案感</li>
                <li>C 铜锈棕：比 A 更沉、少一点甜</li>
                <li>D 雾蓝灰：偏相册 App，仍避开亮蓝紫</li>
                <li>E 暖米金：更柔，按钮对比略弱</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#5c564e]">
          路径 <code className="text-[#a89f91]">/theme-lab</code>
          · 选定后回复字母（如「用 B」），再改正式 theme token。
        </p>
      </div>
    </div>
  );
}
