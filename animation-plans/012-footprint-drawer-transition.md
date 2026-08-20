# 012 — 地图足迹抽屉改用可打断的 transition

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 1 file（`FootprintDetail.tsx`）

## Problem

进出场靠 `animate-in` / `animate-out` keyframes。快速换点或连关会从 0% 重放，不能从当前位置改向。

`frontend/components/map/FootprintDetail.tsx:15,57-63` — current:

```ts
const ANIMATION_MS = 300;
        className={cn(
          'absolute inset-x-0 bottom-0 flex h-[90dvh] flex-col pb-16 md:pb-4 pointer-events-none duration-300',
          exiting
            ? 'animate-out slide-out-to-bottom fill-mode-forwards'
            : 'animate-in slide-in-from-bottom'
        )}
```

## Target

用 CSS transition + `translateY`，曲线必须是：

```css
cubic-bezier(0.32, 0.72, 0, 1)
```

时长 300ms（抽屉允许 200–500ms）。进入 `translateY(0)`，离开 `translateY(100%)`（百分比相对元素自身高度，禁止写死 px）。

```tsx
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';

<div
  className="absolute inset-x-0 bottom-0 flex h-[90dvh] flex-col pb-16 md:pb-4 pointer-events-none"
  style={{
    transform: exiting ? 'translateY(100%)' : 'translateY(0)',
    transition: `transform ${ANIMATION_MS}ms ${EASE_DRAWER}`,
  }}
>
```

挂载时要从下方进来：第一次 paint 必须先是 `translateY(100%)`，再在下一帧（`requestAnimationFrame` 或 `useEffect`）设 `translateY(0)`。不要依赖 `@starting-style` 作为唯一路径（可作增强）。推荐：

```ts
const [entered, setEntered] = useState(false);
useEffect(() => {
  if (!renderedId || exiting) return;
  const id = requestAnimationFrame(() => setEntered(true));
  return () => cancelAnimationFrame(id);
}, [renderedId, exiting]);

transform: exiting || !entered ? 'translateY(100%)' : 'translateY(0)'
```

删掉 `animate-in`、`animate-out`、`slide-in-from-bottom`、`slide-out-to-bottom`、`fill-mode-forwards`、壳上的 `duration-300`。

`ANIMATION_MS = 300` 保留，给现有 unmount timeout（L36–39）用。

蒙层（L52–55 的 inset-0 点击层）可加 `opacity` 200ms 同一抽屉曲线；不要 fade 位移。减动时（007 已合）全局会把 duration 压到 0.01ms，timeout 仍 300ms 可接受；若要严谨，timeout 在减动时改为 0。

## Repo conventions to follow

- 抽屉浅色底/结构不要动（`bg-[#fffaf3]/96` 等是可读性修复，不是动效）。
- 不要引入 Framer Motion。用现有 React state + CSS。

## Steps

1. 打开 `frontend/components/map/FootprintDetail.tsx`。
2. 加 `entered` state + rAF effect。
3. 按 Target 替换抽屉壳 className/style。
4. 删除 tailwindcss-animate 的进/出 class。
5. 保持 `exiting` + `setTimeout(ANIMATION_MS)` 的卸载时序。

## Boundaries

- Do NOT 改 `mapApi`、路由跳转、内部列表。
- Do NOT 用 `top`/`height` 做抽屉动画。
- Do NOT 把 timeout 改成听 `transitionend` 除非你同时处理 `propertyName === 'transform'` 与 unmount 竞态；现有 timeout 可以留。

## Verification

- **Mechanical**: `rg "animate-in|animate-out|slide-in-from-bottom" frontend/components/map/FootprintDetail.tsx` 为空。lint 通过。
- **Feel check**: `/map` 点一个足迹。
  - 抽屉从自身底部滑上来，300ms，iOS 味（快起慢停）。
  - 未停稳就点关闭：从当前位置滑回去，不闪到顶再播一遍出场。
  - 马上点另一个点：旧抽屉继续滑走或新内容在同一层替换，不要 keyframes 重头。
  - Animations 10%：只有 transform。
  - `prefers-reduced-motion: reduce`：几乎立刻到位，仍能开关。
- **Done when**: 进出只靠 `translateY` transition；无 `animate-in/out`。
