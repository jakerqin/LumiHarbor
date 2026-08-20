# 001 — 去掉素材卡高频 3D 倾斜

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file（`AssetCard.tsx`）

## Problem

素材库每张卡在 `mousemove` 上做 ±14° 3D 倾斜 + `scale: 1.05`（0.3s）。浏览时每天触发上百次，目的只是装饰。

`frontend/components/assets/AssetCard.tsx:21,103-114` — current:

```ts
const ROTATE_AMPLITUDE = 14;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disableHoverEffects || !innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    gsap.to(innerRef.current, {
      rotateX: (offsetY / (rect.height / 2)) * -ROTATE_AMPLITUDE,
      rotateY: (offsetX / (rect.width / 2)) * ROTATE_AMPLITUDE,
      scale: 1.05,
      duration: 0.3,
      overwrite: 'auto',
    });
  };
```

离开时还要 0.4s 回正（L124–133）。`disableHoverEffects` 只在少数调用方为 true。

## Target

删除 `ROTATE_AMPLITUDE`、`handleMouseMove`，以及 inner 的 rotate/scale tween。

保留 overlay 淡入淡出，时长 200ms，曲线 `cubic-bezier(0.23, 1, 0.32, 1)`：

```ts
const OVERLAY_EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';

const handleMouseEnter = () => {
  if (disableHoverEffects) return;
  if (overlayRef.current) {
    gsap.to(overlayRef.current, { opacity: 1, duration: 0.2, ease: OVERLAY_EASE, overwrite: 'auto' });
  }
};

const handleMouseLeave = () => {
  if (disableHoverEffects) return;
  if (overlayRef.current) {
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: OVERLAY_EASE, overwrite: 'auto' });
  }
};
```

JSX 上若有 `onMouseMove={handleMouseMove}`，删掉该 prop。`disableHoverEffects === true` 时继续 `gsap.set(overlay, { opacity: 0 })`，不要再 set rotate/scale（可删 inner 的 set）。

不要给卡片加 `scale(1.02)` hover——高频列表连轻微缩放也不要。

## Repo conventions to follow

- 卡片仍用 GSAP 做 overlay，不要改成新库。
- `AssetMasonry` 已传 `disableEntryAnimation`，不要重开卡片自己的 500ms 入场。
- 细指针门闩是 009 的活；本计划先删 tilt，009 再给剩余 hover 加 media。

## Steps

1. 打开 `frontend/components/assets/AssetCard.tsx`，删除 `ROTATE_AMPLITUDE`。
2. 删除 `handleMouseMove` 整函数。
3. 按 Target 重写 enter/leave；leave 不再 tween `innerRef`。
4. 从根节点去掉 `onMouseMove={handleMouseMove}`。
5. `disableHoverEffects` 的 effect（L46–54）只 reset overlay opacity，删 `innerRef` 的 rotateX/rotateY/scale set。若 `innerRef` 不再被 JS 使用，可保留 DOM ref（若 JSX 还需要 perspective 容器）或一并去掉未用 ref——不要留 lint 未使用变量。

## Boundaries

- Do NOT 改收藏 mutation、选择态、点击进详情。
- Do NOT 改 `AssetMasonry` 布局。
- Do NOT 加 `hover:scale-*` 作为「补偿」。

## Verification

- **Mechanical**: `rg ROTATE_AMPLITUDE frontend` 无结果；`rg handleMouseMove frontend/components/assets/AssetCard.tsx` 无结果。`npm --prefix frontend run lint` 通过。
- **Feel check**: `/assets` 鼠标在卡片上快速划过：卡片不跟着转、不放大。信息遮罩约 200ms 淡入。DevTools Animations 10%：只有 overlay opacity，没有 rotateX/Y。
- **Done when**: 默认瀑布流 hover 零 3D、零 scale；overlay 仍可用。
