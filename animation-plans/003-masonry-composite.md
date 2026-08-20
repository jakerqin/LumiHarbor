# 003 — 瀑布流只动画 transform/opacity，宽高立即设置

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 3 files（`AssetMasonry.tsx`、`AlbumMasonry.tsx`、`masonry.css`）

## Problem

GSAP 在入场和窗口缩放时 tween `width` / `height`（触发布局），还带 `filter: blur`。`.masonry-item` 的 `will-change` 包含 `width, height`。

`frontend/components/assets/AssetMasonry.tsx:239-244` — current:

```ts
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h,
      };
```

`fromTo` 的 `initialState`（L249–256）同样带 `width`/`height`/`filter`。`else` 分支（L272–277）整包 `animationProps` 用 0.6s tween。

`frontend/components/assets/masonry.css:8-10` — current:

```css
.masonry-item {
  position: absolute;
  will-change: transform, width, height, opacity;
```

相册 `AlbumMasonry.tsx:211-216` 同一结构。

## Target

对每个 item：

```ts
gsap.set(selector, { width: item.w, height: item.h, filter: 'none' });
```

入场只 tween：

```ts
gsap.fromTo(
  selector,
  { opacity: 0, x: initialPos.x, y: initialPos.y },
  {
    opacity: 1,
    x: item.x,
    y: item.y,
    duration,
    ease,
    delay: index * stagger,
    overwrite: 'auto',
  }
);
```

已挂载后的重排：

```ts
gsap.set(selector, { width: item.w, height: item.h, filter: 'none' });
gsap.to(selector, {
  x: item.x,
  y: item.y,
  duration: 0.2,
  ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
  overwrite: 'auto',
});
```

`masonry.css`：

```css
.masonry-item {
  position: absolute;
  will-change: transform, opacity;
  cursor: pointer;
  top: 0;
  left: 0;
  box-sizing: border-box;
}
```

禁止在 tween vars 里出现 `width`、`height`、`filter`。

## Repo conventions to follow

- 先跑 002（改默认时长与 +12px）。本计划改的是同一 `useLayoutEffect`。若 002 未跑，仍按本 Target 写，并把 `duration` 默认当成 0.2。
- 若 007 已合入，减动分支继续 `gsap.set` 全部终态，不要 fromTo。
- 相册文件没有 `masonry.css`；只改 Asset 这份 CSS。相册 item class 若内联 will-change，一并去掉 width/height。

## Steps

1. `AssetMasonry.tsx`：拆掉 `animationProps` 里的 width/height；循环开头 `gsap.set` 尺寸。
2. `AssetMasonry.tsx`：`fromTo` / `to` 只留 x、y、opacity（加 overwrite）。
3. 对 `AlbumMasonry.tsx` 做同样两步。
4. 改 `frontend/components/assets/masonry.css` 的 `will-change`。

## Boundaries

- Do NOT 改列数算法、预加载、`AssetCard`。
- Do NOT 把定位从 `x`/`y` 改成 `top`/`left` CSS。
- Do NOT 加依赖。

## Verification

- **Mechanical**: `rg "width: item" frontend/components/assets/AssetMasonry.tsx` 只应出现在 `gsap.set`，不要在 `fromTo`/`to` 的动画目标里。`npm --prefix frontend run lint` 通过。
- **Feel check**: `/assets` 首屏仍平滑出现（200ms 短位移）。拉浏览器宽度：卡片格子变了但**没有**慢慢拉宽的过程，只是位置 200ms 挪过去。Chrome Performance：入场期间不应出现大片 Layout 由 width/height 动画引起。
- DevTools Animations 10%：高亮属性只有 transform / opacity。
- **Done when**: 两份 masonry 的 tween vars 不含 width/height/filter；CSS will-change 只有 transform, opacity。
