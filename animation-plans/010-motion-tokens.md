# 010 — 抽出动效 token 并删掉未用的 0.8s fade-in

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens
- **Estimated scope**: 3 files（`globals.css`、`lib/utils/gsap.ts`、`tailwind.config.ts`）

## Problem

曲线和时长全是手写，产品手感不齐：GSAP 用 `power2.out` / `power3.out` / 500ms，Tailwind 用 `duration-200` / `duration-300` / `ease-out`，另有一份从未引用的 0.8s fade-in。

`frontend/lib/utils/gsap.ts:4-26` — current:

```ts
export const hoverScale = {
  scale: 1.05,
  duration: 0.3,
  ease: 'power2.out',
};

export const tapScale = {
  scale: 0.95,
  duration: 0.1,
  ease: 'power2.out',
};

export const fadeIn = {
  from: {
    opacity: 0,
    y: 20,
  },
  to: {
    opacity: 1,
    y: 0,
    duration: 0.5,
    ease: 'power2.out',
  },
};
```

`frontend/app/globals.css:129-142` — current（无调用方，`rg animate-fade-in frontend` 只命中定义）：

```css
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}
```

`frontend/tailwind.config.ts:69-84` — current：`fade-in 0.3s`、`slide-up 0.4s`、`scale-in 0.3s`，曲线都是裸 `ease-out`。

## Target

在 `frontend/app/globals.css` 的 `:root` 增加（值必须原样，禁止近似）：

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 160ms;
--duration-tooltip: 150ms;
--duration-dropdown: 200ms;
--duration-modal: 200ms;
```

`frontend/lib/utils/gsap.ts` 对齐同一套数（GSAP duration 用秒）：

```ts
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

export const hoverScale = {
  scale: 1.02,
  duration: 0.16,
  ease: EASE_OUT,
};

export const tapScale = {
  scale: 0.97,
  duration: 0.16,
  ease: EASE_OUT,
};

export const fadeIn = {
  from: { opacity: 0, y: 12 },
  to: { opacity: 1, y: 0, duration: 0.2, ease: EASE_OUT },
};
```

删除 `globals.css` 里未使用的 `@keyframes fade-in` 与 `.animate-fade-in`。

`tailwind.config.ts` 的三套 keyframes 时长改为 200ms / 200ms / 200ms，easing 字符串写成 `cubic-bezier(0.23, 1, 0.32, 1)`。`scale-in` 的 from 保持 `scale(0.9)`（禁止改成 `scale(0)`）。

## Repo conventions to follow

- CSS 变量放在 `frontend/app/globals.css` `@layer base` 的 `:root`，与 `--background` / `--scrollbar-thumb` 并列。
- GSAP 预设只放 `frontend/lib/utils/gsap.ts`，hook 从这里读默认值：`frontend/lib/hooks/useGsapPressableScale.ts` 已 `import { hoverScale, tapScale } from '@/lib/utils/gsap'`。
- 注释中文。不要新建 `tokens.css`。

## Steps

1. 编辑 `frontend/app/globals.css`：在 `:root`（约 L9–17）追加上面 7 个变量。
2. 删除 `frontend/app/globals.css` L126–143 整段 `/* GSAP 动画相关样式 */`（含 `@keyframes fade-in` 与 `.animate-fade-in`）。
3. 用 Target 中的内容整体替换 `frontend/lib/utils/gsap.ts`。
4. 编辑 `frontend/tailwind.config.ts` `theme.extend.animation` / `keyframes`：
   - `"fade-in": "fade-in 0.2s cubic-bezier(0.23, 1, 0.32, 1)"`
   - `"slide-up": "slide-up 0.2s cubic-bezier(0.23, 1, 0.32, 1)"`
   - `"scale-in": "scale-in 0.2s cubic-bezier(0.23, 1, 0.32, 1)"`
   - `slide-up` from 改为 `translateY(12px)`（不要 20px）。
   - `scale-in` from 保持 `scale(0.9)` + `opacity: 0`。

## Boundaries

- Do NOT 改任何组件 JSX / 业务逻辑。
- Do NOT 在本计划里给组件接 `prefers-reduced-motion`（那是 007）。
- Do NOT 新增 npm 依赖。
- 若 `animate-fade-in` 在 70c4633 之后又被引用，STOP 并报告，不要删类。

## Verification

- **Mechanical**: `rg "animate-fade-in" frontend` 无引用；`rg --ease-out frontend/app/globals.css` 能看到 token；`npm --prefix frontend run lint` 通过。
- **Feel check**: 本计划本身几乎无可见变化。打开笔记列表，hover「新建」按钮（走 `useGsapPressableScale` 默认值）：放大应是轻微的 1.02，约 160ms，起步快。DevTools Animations 放到 10% 时不应再看到 300ms 的明显滞涩。
- **Done when**: 三个文件含上述精确曲线；未用 0.8s fade-in 已删；`hoverScale.duration === 0.16` 且 `tapScale.scale === 0.97`。
