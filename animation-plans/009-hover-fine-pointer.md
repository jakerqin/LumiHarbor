# 009 — Hover 位移/缩放只在细指针设备生效

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 4 files（`useGsapPressableScale.ts`、`AlbumCard.tsx`、`TimelineEvent.tsx`、`FavoriteButton.tsx`）

## Problem

Hover 引起的位移/缩放没有 `@media (hover: hover) and (pointer: fine)`。触屏点一下会当成 hover，卡片抬起或心形放大。

`frontend/lib/hooks/useGsapPressableScale.ts:55-58` — current：`onMouseEnter` 无条件 `gsap.to(..., { scale: hoverScaleValue })`。

`frontend/components/albums/AlbumCard.tsx:53-59` — current：

```ts
    gsap.to(cardRef.current, {
      y: -8,
      duration: 0.3,
      ease: 'power2.out',
    });
```

`frontend/components/home/TimelineEvent.tsx:58` — current：

```tsx
              className="object-cover transition-transform duration-300 hover:scale-110"
```

`frontend/components/assets/FavoriteButton.tsx:80` — current：未收藏时 `group-hover:scale-110`。

`AssetCard` 的 tilt 由 001 删除后，本计划不必再改 3D。

## Target

1. Hook：只在细指针上跑 hover scale。Press（mousedown）所有指针都保留。

```ts
const canHover =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const onMouseEnter = useCallback(() => {
  isHoveringRef.current = true;
  if (!canHover) return;
  tweenTo({ scale: hoverScaleValue, duration: hoverDuration, ease: hoverEase });
}, [...]);
```

`canHover` 用 `useRef` + `matchMedia` 的 `change` 监听，不要只算一次模块常量（接上显示器时会变）。

2. `AlbumCard`：同样门闩。能 hover 时 `y: -6`（略收）、`duration: 0.16`、`ease: 'cubic-bezier(0.23, 1, 0.32, 1)'`。不能 hover 则 enter/leave no-op。

3. CSS hover 缩放包进 media。在 `frontend/app/globals.css` `@layer utilities` 加：

```css
@media (hover: hover) and (pointer: fine) {
  .motion-hover-scale-110:hover {
    transform: scale(1.1);
  }
}
```

`TimelineEvent` 封面图改为 `transition-transform duration-200 motion-hover-scale-110`，**删除** `hover:scale-110`。过渡写成 `transform 200ms cubic-bezier(0.23, 1, 0.32, 1)`。

`FavoriteButton` 的 `group-hover:scale-110` 同样换成该 utility（或 `group-hover` 版本）：

```css
@media (hover: hover) and (pointer: fine) {
  .group:hover .motion-group-hover-scale-110 {
    transform: scale(1.1);
  }
}
```

不要用未门闩的 Tailwind `hover:scale-*`。

## Repo conventions to follow

- 若 010 已合入，AlbumCard / hook 默认值应已是 1.02 / 0.16；本计划不要改回 1.05 / 0.3。
- 全局已有 `button { transition-colors }`（`globals.css` L118–123），不要给按钮再叠一层未门闩的 scale。

## Steps

1. 改 `useGsapPressableScale.ts`：ref + matchMedia + enter 短接。
2. 改 `AlbumCard.tsx` 的 enter/leave。
3. 在 `globals.css` 加两个 utility。
4. 改 `TimelineEvent.tsx`、`FavoriteButton.tsx` 的 class。
5. `rg "hover:scale-" frontend/components --glob '!**/novel-native/**'`：业务组件不应再有未门闩的 scale hover。笔记编辑器内部可跳过。

## Boundaries

- Do NOT 改 Novel / ProseMirror。
- Do NOT 给 `MobileBottomNav` 加 hover 缩放。
- Do NOT 用 JS 在 touch 上模拟 hover。

## Verification

- **Mechanical**: 业务组件无裸 `hover:scale-`（除 novel-native）。lint 通过。
- **Feel check**:
  - 桌面：笔记「新建」仍有轻微 press/hover；相册卡可上移约 6px。
  - Chrome Device Mode 或 `hover: none`：点相册卡/收藏，松手后**不**停留在抬起或 scale-110。
  - Rendering 里改 `Emulate hover: none` 再点封面，确认无残留缩放。
- **Done when**: GSAP hover 与 CSS scale hover 都要求 `(hover: hover) and (pointer: fine)`。
