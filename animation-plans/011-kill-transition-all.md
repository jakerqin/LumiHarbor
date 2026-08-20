# 011 — 高频 UI 去掉 transition-all

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: MEDIUM
- **Category**: Performance
- **Estimated scope**: 5 files

## Problem

`transition-all` 会把 width/color/transform 等一并推进过渡，离开 GPU 只合成的路径。

必须改的现场（70c4633）：

`frontend/components/assets/FavoriteButton.tsx:70,78`：

```
        transition-all duration-200
          w-5 h-5 transition-all duration-200
```

`frontend/components/notes/NoteCard.tsx:74`：

```
      <div className="p-6 bg-background-secondary hover:bg-background-tertiary border border-white/10 hover:border-primary/50 rounded-xl transition-all">
```

`frontend/components/home/TimelineEvent.tsx:50`：

```
        className="glass rounded-2xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
```

`frontend/components/upload/MobileAssetPicker.tsx:34`：

```
          className="w-full h-40 rounded-2xl border-2 border-dashed border-white/15 hover:border-primary/40 active:scale-[0.99] transition-all ...
```

`frontend/app/(main)/mobile-upload/page.tsx:175`：

```
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
```

另：`frontend/components/notes/NoteTimeline.tsx:147,247` 也有 `transition-all`，一并改。

`DockNavigation` 的 `transition-all` 由 006 删除，本计划不要再碰 Dock。

笔记编辑器 `frontend/components/notes/novel-native/**` 的 `transition-all` **不要改**（第三方皮肤）。

## Target

只过渡实际会变的属性：

| 文件 | 替换为 |
| --- | --- |
| FavoriteButton 按钮 | `transition-colors duration-200` |
| FavoriteButton 图标 | `transition-transform duration-200`（009 的 scale utility 需要 transform） |
| NoteCard / NoteTimeline / TimelineEvent 卡片壳 | `transition-colors duration-200` |
| MobileAssetPicker | `transition-[border-color,transform] duration-200`；`active:scale-[0.97]`（按压 0.97，160ms 语义；若只能写 Tailwind 默认 duration，用 `duration-150`） |
| mobile-upload 进度条 | `transition-[width] duration-200 ease-linear`（进度是持续变化 → linear） |

禁止再写 `transition-all`。

## Repo conventions to follow

- 全局已对 `button`/`a` 设了 `transition-colors duration-200`（`globals.css` L118–123）。卡片是 `div`，必须自己写 colors。
- 进度条用 `linear`，不要 ease-out。

## Steps

1. `FavoriteButton.tsx`：两处 `transition-all` 按表替换。
2. `NoteCard.tsx` L74、`NoteTimeline.tsx` L147 与 L247：`transition-all` → `transition-colors duration-200`。
3. `TimelineEvent.tsx` L50：同上。
4. `MobileAssetPicker.tsx` L34：按表替换。
5. `mobile-upload/page.tsx` L175：`transition-[width] duration-200 ease-linear`。
6. `rg "transition-all" frontend --glob '!**/novel-native/**' --glob '!**/animation-plans/**'`：业务代码应为 0（Dock 若 006 未跑会仍命中，先跑 006 或顺手删）。

## Boundaries

- Do NOT 改 novel-native。
- Do NOT 改 `DomeGallery.tsx`（005）。
- Do NOT 把进度条改成立即跳变（需要 width 过渡，但是 linear + 只过渡 width）。

## Verification

- **Mechanical**: 上述 rg 在业务组件为 0。lint 通过。
- **Feel check**:
  - 收藏心：颜色/填充变，无整钮尺寸动画。
  - 笔记卡 hover：只有底和边变色。
  - `/mobile-upload` 上传：进度条宽度平滑增长，无弹跳；不是 `ease-in`。
- **Done when**: 业务层（除 novel-native）无 `transition-all`。
