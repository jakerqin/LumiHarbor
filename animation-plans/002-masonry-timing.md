# 002 — 把瀑布流入场从 800ms 营销秀收成 200ms UI

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Easing & duration
- **Estimated scope**: 2 files（`AssetMasonry.tsx`、`AlbumMasonry.tsx`）

## Problem

素材库/相册是最高频列表，入场却按营销页做：0.8s、从视口外飞入、blur(10px)、50ms stagger。UI 动画应 &lt;300ms。

`frontend/components/assets/AssetMasonry.tsx:146-150` — current:

```ts
  animateFrom = 'bottom',
  blurToFocus = true,
  duration = 0.8,
  stagger = 0.05,
  ease = 'power3.out',
```

同文件 `L221-222`：`bottom` 分支把 `y` 设成 `window.innerHeight + 200`。

`frontend/components/albums/AlbumMasonry.tsx:122-125` 默认值相同。

## Target

两份文件的 props 默认值改为：

```ts
  animateFrom = 'bottom',
  blurToFocus = false,
  duration = 0.2,
  stagger = 0.04,
  ease = 'cubic-bezier(0.23, 1, 0.32, 1)',
```

`getInitialPosition` 的 `bottom` 分支改为相对最终格子 +12px，禁止飞出视口：

```ts
case 'bottom':
  return { x: item.x, y: item.y + 12 };
```

其它方向若仍存在：`top` → `item.y - 12`；`left` → `x: item.x - 12`；`right` → `x: item.x + 12`；`center` / `default` 用最终 `item.x/item.y`。删掉 `window.innerHeight + 200` / `window.innerWidth + 200` / `-200`。

`blurToFocus === true` 时仍可加 blur，但默认是 `false`，本计划不要再给默认路径加 `filter`。

响应式重排那支 `gsap.to(..., { duration: 0.6 })`（Asset `L272-277`，Album `L244-249`）时长改为 `0.2`，ease 改为 `cubic-bezier(0.23, 1, 0.32, 1)`。**本计划仍可 tween width/height**——那是 003 的活。

## Repo conventions to follow

- 两份 masonry 保持平行结构，改一处就改另一处。
- 卡片入场已被 `disableEntryAnimation` 关掉（`AssetMasonry.tsx:314`），不要再去改 `AssetCard` 的 500ms `fadeIn`（001 管 tilt）。
- 若 010 已合入，ease 字符串必须与 `EASE_OUT` 一致：`cubic-bezier(0.23, 1, 0.32, 1)`。

## Steps

1. `AssetMasonry.tsx`：改函数参数默认值（L146–150）。
2. `AssetMasonry.tsx`：改 `getInitialPosition` switch，按 Target 用 ±12px。
3. `AssetMasonry.tsx`：`else` 分支 `duration: 0.6` → `0.2`，`ease: 'power3.out'` → `cubic-bezier(0.23, 1, 0.32, 1)`。
4. 对 `AlbumMasonry.tsx` 做完全相同的三步（默认值、getInitialPosition、resize tween）。

## Boundaries

- Do NOT 改最短列布局算法、GAP、预加载。
- Do NOT 在本计划里把 width/height 从 tween 里拿掉（003）。
- Do NOT 改 `AssetCard` / `AlbumCard` hover。
- Do NOT 加依赖。

## Verification

- **Mechanical**: `rg "duration = 0.8" frontend/components` 无默认 0.8；`rg "innerHeight" frontend/components/assets/AssetMasonry.tsx` 无入场位移。`npm --prefix frontend run lint` 通过。
- **Feel check**: 打开 `/assets`（有图）。
  - 首屏卡片从下方约一张手指宽度滑入，约 200ms，起步快。
  - DevTools Animations 10%：看不到从窗口底外飞进来；看不到模糊变清晰。
  - 第一张与最后一张间隔 ≤ `n * 40ms`。
  - `prefers-reduced-motion: reduce`（若 007 已合）应无位移。
- **Done when**: 两文件默认 `duration === 0.2`、`blurToFocus === false`、`stagger === 0.04`，bottom 初值是 `item.y + 12`。
