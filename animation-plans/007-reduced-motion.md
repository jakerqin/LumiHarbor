# 007 — 为位移与常驻 WebGL 接上 prefers-reduced-motion

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 6 files（globals + 粒子 + 瀑布流 ×2 + Dock + BlurText）

## Problem

全站没有 `prefers-reduced-motion`。减动用户仍会吃瀑布飞入、Dock 滑出、3D 倾斜、首页 WebGL 常驻 rAF。减动应保留颜色/透明度反馈，去掉位移。

当前无任何匹配：`rg prefers-reduced-motion frontend` 应为 0。

常驻循环证据 `frontend/components/background/ParticleBackground.tsx:255-282`：

```ts
const update = (t: number) => {
  animationFrameId = requestAnimationFrame(update);
  // ...
  renderer.render({ scene: particles, camera });
};
animationFrameId = requestAnimationFrame(update);
```

瀑布流默认飞入 + blur：`frontend/components/assets/AssetMasonry.tsx:148-150`（相册同构 `AlbumMasonry.tsx:123-125`）。

Dock 滑出：`frontend/components/layout/DockNavigation.tsx:22-26`。

BlurText 逐字位移+blur：`frontend/components/animations/BlurText.tsx:31-42`。

## Target

1. `frontend/app/globals.css` 在 `@layer base` 末尾（`button`/`a` 过渡块之后）加：

```css
@media (prefers-reduced-motion: reduce) {
  html:not([data-allow-motion]) *,
  html:not([data-allow-motion]) *::before,
  html:not([data-allow-motion]) *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

不要写成「全部 `animation: none`」——要留极短透明度变化，不要核掉所有反馈。

2. 新增 `frontend/lib/hooks/usePrefersReducedMotion.ts`：

```ts
'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

3. JS 分支（减动时）：
   - `ParticleBackground`：不启动 `requestAnimationFrame` 循环；可以 render 一帧静态图或直接 `return null`。优先 **不挂 canvas / 取消 rAF**。
   - `AssetMasonry` / `AlbumMasonry`：`gsap.set` 到最终 `x,y,opacity:1`，不要 `fromTo`。
   - `DockNavigation`：`isVisible` 变化时 `gsap.set(nav, { x: isVisible ? '0%' : '100%' })`，不要 0.4s tween。
   - `BlurText`：`gsap.set(spans, { filter: 'blur(0px)', opacity: 1, y: 0 })`。

## Repo conventions to follow

- 客户端 hook 放 `frontend/lib/hooks/`，与 `useGsapPressableScale.ts` 并列。
- 粒子仅首页挂载是有意设计（`frontend/docs/design/05-布局与导航.md`），减动时关掉循环，不要删组件文件。
- 若 010 已合入，CSS 时长用 `var(--duration-*)` 的地方会被上面的 media 覆盖，无需再改。

## Steps

1. 写 `frontend/lib/hooks/usePrefersReducedMotion.ts`（上文全文）。
2. 在 `frontend/app/globals.css` `@layer base` 末尾加入 Target 中的 media query。
3. `ParticleBackground.tsx`：在 `useEffect` 开头读 `window.matchMedia('(prefers-reduced-motion: reduce)').matches`；若 true，只 `resize` 一次可选，**不要** `requestAnimationFrame(update)`。或组件顶层 `usePrefersReducedMotion()` 为 true 时 `return null`。
4. `AssetMasonry.tsx` 与 `AlbumMasonry.tsx` 的 `useLayoutEffect` 动画块：`reduced` 则对每个 selector `gsap.set(selector, { x: item.x, y: item.y, width: item.w, height: item.h, opacity: 1, filter: 'none' })` 后 `continue`。
5. `DockNavigation.tsx` 滑入 `useEffect`（L20–27）：减动走 `gsap.set`，否则保持现有 tween（时长留给 008 改）。
6. `BlurText.tsx`：减动走 `gsap.set`，否则保持现有 `fromTo`。

## Boundaries

- Do NOT 改 DomeGallery 自动旋转逻辑（005 管 `transition: all`；减动用全局 CSS 压 duration 即可）。
- Do NOT 改笔记 ProseMirror / Novel 样式。
- Do NOT 新增依赖。
- Do NOT 把减动做成「全站禁用 transition-colors」。

## Verification

- **Mechanical**: `rg prefers-reduced-motion frontend` 至少命中 `globals.css` 与 hook；`npm --prefix frontend run lint` 通过。
- **Feel check**: Chrome DevTools → Rendering → `prefers-reduced-motion: reduce`。
  - 打开 `/`：无粒子持续转动；「拾光坞」四字立即清晰，无上移模糊。
  - 打开 `/assets`：卡片立刻在位，不从屏幕底部飞入。
  - 桌面把鼠标移到右缘：Dock 应立即出现/消失，不要 400ms 滑入。
  - 关掉 reduce 后上述位移应恢复。
- **Done when**: 减动下无持续 rAF 粒子、无飞入、无 Dock 滑移；非减动行为与改前一致（除其它计划已改的部分）。
