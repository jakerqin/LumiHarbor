# 006 — Dock 指示条用 translateY，去掉 transition-all

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file（`DockNavigation.tsx`）

## Problem

路由指示条用 GSAP 动画 `top`（布局属性），元素还挂着 `transition-all duration-300`，和 GSAP 抢同一属性。

`frontend/components/layout/DockNavigation.tsx:81-106` — current:

```ts
    gsap.to(indicatorRef.current, {
      top: buttonRect.top + buttonRect.height / 2 - 12,
      duration: 0.3,
      ease: 'power2.out',
    });
  }, [pathname]);

        className={cn(
          'fixed right-0 w-1 h-6 bg-primary rounded-l-full shadow-[0_0_12px_rgba(212,180,131,0.35)]',
          'transition-all duration-300 z-40'
        )}
```

## Target

指示条固定 `top: 0`，用 `transform: translateY(...)` 对齐到活动按钮中心（条高度 24px / `h-6`，所以是 `buttonCenterY - 12`）。

```ts
const indicator = indicatorRef.current;
const y = buttonRect.top + buttonRect.height / 2 - 12;
gsap.to(indicator, {
  y,
  duration: 0.2,
  ease: 'cubic-bezier(0.23, 1, 0.32, 1)',
  overwrite: 'auto',
});
```

className 改为（不要 `transition-all`）：

```ts
className={cn(
  'fixed right-0 top-0 w-1 h-6 bg-primary rounded-l-full shadow-[0_0_12px_rgba(212,180,131,0.35)]',
  'z-40'
)}
```

不要同时写 CSS `transition-transform` 和 GSAP `y`。

减动（若 007 已合）：`gsap.set(indicator, { y })`。

## Repo conventions to follow

- Dock 滑入/按钮/tooltip 是有意设计（`frontend/docs/design/13-动效与工具.md`），本计划只改指示条位移属性。
- 按钮 hover 的 `x: -8` 已是 transform，保持；008 再收时长。

## Steps

1. 指示条 class：加 `top-0`，删 `transition-all duration-300`。
2. pathname effect：`top: ...` 改成 `y: ...`，duration `0.2`，ease 用上面的 cubic-bezier，加 `overwrite: 'auto'`。
3. 删掉 style 里若存在的内联 `top`。`display` 逻辑（无匹配则 none）保留。

## Boundaries

- Do NOT 改边缘唤出距离、tooltip、按钮 GSAP（008）。
- Do NOT 动画 `height` 做指示条伸展。
- Do NOT 给移动底栏加指示条动画。

## Verification

- **Mechanical**: `rg "transition-all" frontend/components/layout/DockNavigation.tsx` 为空；`rg "top:" frontend/components/layout/DockNavigation.tsx` 的 GSAP tween 不再写 `top`。lint 通过。
- **Feel check**: 桌面宽度，从 `/assets` 点到 `/albums`。右侧金条 200ms 滑到新图标中心，起步快，条本身不拉长。Animations 10%：属性是 transform，不是 top。
- **Done when**: 指示条位移只走 `y`/`translateY`；无 `transition-all`。
