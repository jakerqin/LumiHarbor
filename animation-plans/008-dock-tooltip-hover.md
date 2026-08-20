# 008 — Dock tooltip 去 ease-in，同一次扫过后续 instant

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file（`DockNavigation.tsx`）

## Problem

每个 tooltip hover 都 `fromTo`；隐藏用 `power2.in`（ease-in，起步慢）。按钮 hover 还是 300ms `scale 1.05`。同一排 toolbar 里，第一个之后的 tooltip 应几乎瞬间出现。

`frontend/components/layout/DockNavigation.tsx:57-68` — current:

```ts
        gsap.fromTo(
          tooltip,
          { opacity: 0, x: 10 },
          { opacity: 1, x: 0, duration: 0.2, ease: 'power2.out' }
        );
      } else {
        gsap.to(tooltip, { opacity: 0, x: 10, duration: 0.15, ease: 'power2.in' });
      }
```

`L132-144` — current:

```ts
                      animateButton(index, { x: -8, scale: 1.05, duration: 0.3, ease: 'power2.out' });
                    onMouseLeave={() => {
                      animateButton(index, { x: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
                    onMouseDown={() =>
                      animateButton(index, { scale: 0.95, duration: 0.1, ease: 'power2.out' })
                    onMouseUp={() =>
                      animateButton(index, { scale: 1.05, duration: 0.1, ease: 'power2.out' })
```

滑入 Dock 本身 400ms（L22–26）可收到 200–300ms，曲线改强 ease-out；这是偶发抽屉，允许 ≤300ms。

## Target

常量：

```ts
const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
const TOOLTIP_MS = 0.15;
const TOOLTIP_FOLLOWUP_MS = 0;
const HOVER_SCALE = 1.02;
const HOVER_DURATION = 0.16;
const PRESS_SCALE = 0.97;
const PRESS_DURATION = 0.16;
const DOCK_SLIDE = 0.25;
```

用 `useRef(0)` 记 `lastTooltipAt`。`hoveredIndex !== null` 时：若 `performance.now() - lastTooltipAt < 400`，duration 用 `TOOLTIP_FOLLOWUP_MS`，否则 `TOOLTIP_MS`。然后 `lastTooltipAt = performance.now()`。

显示与隐藏都用 `EASE_OUT`（禁止 `power2.in`）：

```ts
gsap.to(tooltip, { opacity: 1, x: 0, duration, ease: EASE_OUT, overwrite: 'auto' });
gsap.to(tooltip, { opacity: 0, x: 10, duration: TOOLTIP_MS, ease: EASE_OUT, overwrite: 'auto' });
```

不要对显示再 `fromTo`（会从 0 重放，打断扫过）。未悬停的 tooltip 用 `to` 藏起来即可。

按钮：

```ts
animateButton(index, { x: -8, scale: HOVER_SCALE, duration: HOVER_DURATION, ease: EASE_OUT, overwrite: 'auto' });
animateButton(index, { x: 0, scale: 1, duration: HOVER_DURATION, ease: EASE_OUT, overwrite: 'auto' });
animateButton(index, { scale: PRESS_SCALE, duration: PRESS_DURATION, ease: EASE_OUT, overwrite: 'auto' });
animateButton(index, { scale: HOVER_SCALE, duration: PRESS_DURATION, ease: EASE_OUT, overwrite: 'auto' });
```

滑入：

```ts
gsap.to(navRef.current, {
  x: isVisible ? '0%' : '100%',
  duration: DOCK_SLIDE,
  ease: EASE_OUT,
  overwrite: 'auto',
});
```

## Repo conventions to follow

- 先跑 006（指示条）。本计划不要把指示条改回 `top`。
- `display: hoveredIndex === index ? 'block' : 'none'`（L163）会让 opacity tween 看不见。保持 display 逻辑，但 **先** 让目标 tooltip `display:block` 再 `gsap.to`；隐藏完成后再 `display:none`，或一直 `display:block` + `pointer-events-none` 只靠 opacity。推荐：全部 tooltip 保持 DOM 可见性由 opacity/visibility 控制，避免 `display:none` 掐断过渡。若改 display，隐藏用 `onComplete` 再设 none。

## Steps

1. 文件顶部加 Target 常量。
2. 加 `lastTooltipAt` ref；重写 L57–70 的 tooltip effect。
3. 重写按钮 enter/leave/down/up 的 duration/scale/ease。
4. 滑入 effect duration `0.4` → `0.25`，ease 换 EASE_OUT。
5. 修 tooltip `display` 与 tween 的时序（见上）。

## Boundaries

- Do NOT 改 `SHOW_DISTANCE` / `HIDE_DISTANCE` / 快捷键展示。
- Do NOT 给移动底栏做 tooltip。
- Do NOT 用 keyframes 做 tooltip。

## Verification

- **Mechanical**: `rg "power2.in" frontend/components/layout/DockNavigation.tsx` 为空；`rg "scale: 1.05" frontend/components/layout/DockNavigation.tsx` 为空。lint 通过。
- **Feel check**: 桌面唤出 Dock。
  - 第一个 tooltip 约 150ms 从右侧 10px 滑入，起步快。
  - 400ms 内扫到下一个：文字几乎立刻换，没有又一次 200ms fromTo。
  - 离开：150ms ease-out 淡出，没有「先顿一下再走」。
  - 按下图标：缩到约 0.97，160ms；松开回到 1.02（仍悬停）。
  - Animations 10% 确认隐藏曲线不是 ease-in。
- **Done when**: 无 `power2.in`、无 300ms/1.05 hover；400ms 内后续 tooltip duration 为 0。
