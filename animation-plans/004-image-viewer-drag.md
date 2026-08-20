# 004 — 拖拽时关掉 ImageViewer 的 transform 过渡

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Performance / Interruptibility
- **Estimated scope**: 1 file（`ImageViewer.tsx`）

## Problem

拖拽通过 React state 每帧改 `translate`，但 img 一直挂着 `transition-transform duration-100`。指针已经走了，图还在用 100ms 追，发黏。

`frontend/components/assets/ImageViewer.tsx:220-226` — current:

```tsx
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={cn(
            'w-full max-h-[72vh] object-contain transition-transform duration-100',
            !isLoaded && 'opacity-0'
          )}
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: 'center center',
          }}
```

`isDragging` 已在 L22、L87–99 维护。

## Target

拖拽中：`transition: none`。
非拖拽（滚轮缩放、按钮缩放、松手）：只过渡 transform，160ms，`cubic-bezier(0.23, 1, 0.32, 1)`。

```tsx
className={cn(
  'w-full max-h-[72vh] object-contain',
  isDragging
    ? '[transition:none]'
    : '[transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)]',
  !isLoaded && 'opacity-0'
)}
```

或等价的 style：

```ts
transition: isDragging ? 'none' : 'transform 160ms cubic-bezier(0.23, 1, 0.32, 1)',
```

不要 `transition-all`。不要动画 `width`/`top`。

## Repo conventions to follow

- 组件已用 `cn()`（`frontend/lib/utils/cn.ts`）。
- 任意按钮的颜色过渡继续走全局 `transition-colors duration-200`（`globals.css` L118–123），不要动控制条。

## Steps

1. 打开 `frontend/components/assets/ImageViewer.tsx`。
2. 按 Target 替换 img 的 `className`（去掉固定的 `transition-transform duration-100`）。
3. 可选：把 transition 写进现有 `style` 对象，与 `transform` 并列。二选一，不要两套同时写。

## Boundaries

- Do NOT 改缩放步进、拖拽边界计算、双击、Ctrl+wheel 逻辑。
- Do NOT 引入弹簧库。
- Do NOT 给加载 spinner 加新动画。

## Verification

- **Mechanical**: `rg "duration-100" frontend/components/assets/ImageViewer.tsx` 无 transform 过渡。lint 通过。
- **Feel check**: 打开任意素材详情，⌘/Ctrl+滚轮放大后拖图。
  - 拖的时候图贴着指针，没有 100ms 尾巴。
  - 松手后若点了重置/缩放按钮，图用约 160ms ease-out 到位，起步快。
  - Animations 10%：拖拽区间没有 transform transition 采样。
- **Done when**: `isDragging === true` 时无 transform transition；false 时 160ms ease-out。
