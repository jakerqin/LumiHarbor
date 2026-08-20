# 005 — DomeGallery 放大只过渡 transform 和 opacity

- **Status**: TODO
- **Commit**: 70c4633
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file（`DomeGallery.tsx`）

## Problem

放大/关闭写了 `transition: all`；二次对齐还动画 `left`/`top`/`width`/`height`。`all` 会扫到非合成属性。

`frontend/components/home/DomeGallery.tsx:539` — current:

```js
        transition: all ${enlargeTransitionMs}ms ease-out;
```

同文件 `L723` 与 `L787` — current:

```js
overlay.style.transition = `left ${enlargeTransitionMs}ms ease, top ${enlargeTransitionMs}ms ease, width ${enlargeTransitionMs}ms ease, height ${enlargeTransitionMs}ms ease`;
```

`enlargeTransitionMs` 默认 300（L61），落在 Modal 200–500ms 预算内，时长可保持 300ms。错的是属性和 `ease`（应强 ease-out）。

## Target

所有 overlay / closing clone 的 transition 一律：

```js
`transform ${enlargeTransitionMs}ms cubic-bezier(0.23, 1, 0.32, 1), opacity ${enlargeTransitionMs}ms cubic-bezier(0.23, 1, 0.32, 1)`
```

禁止 `transition: all`。禁止过渡 `left`/`top`/`width`/`height`。

二次对齐（L710–731 与 L775–796）改为 FLIP：

1. `transition = 'none'`
2. 立刻写入目标 `width`/`height`/`left`/`top`（`gsap.set` 语义，无动画）
3. 用 `getBoundingClientRect` 算从当前视觉位置到目标的 `dx/dy` 与 `sx/sy`
4. `transform = translate(dxpx, dypx) scale(sx, sy)`
5. 强制回流 `void overlay.offsetWidth`
6. `transition` 设为上面的 transform/opacity 字符串
7. 下一帧 `transform = 'translate(0, 0) scale(1)'`

`transitionend` 仍只听 `propertyName === 'transform'`（L711 已是这样，保持）。

`L587` 的 `opacity 300ms ease-out` 改为同一 cubic-bezier。`L866` / `L892` 的 `transition: transform 300ms` 补上 `cubic-bezier(0.23, 1, 0.32, 1)`。

## Repo conventions to follow

- 这是首页精选墙，氛围可以比列表华丽，但必须只动合成属性。
- 自动旋转 / 手势惯性（rAF）不要在本计划重写。
- 减动由 007 的全局 media 压 duration；本文件不必再分支，除非你已经碰到 `matchMedia`。

## Steps

1. `rg "transition: all" frontend/components/home/DomeGallery.tsx`，把每一处 `all` 换成 Target 的 transform+opacity 字符串。
2. `rg "left \\$\\{enlargeTransitionMs\\}"` 两处二次对齐：按 FLIP 七步改，删掉对 left/top/width/height 的 transition 赋值。
3. 把裸 `ease-out` / `ease` 的 overlay transition 换成 `cubic-bezier(0.23, 1, 0.32, 1)`。
4. 读一遍 `openItemFromElement` / close 路径，确认 `will-change: transform, opacity` 仍在（L673 已有）。

## Boundaries

- Do NOT 改 Dome 几何、灰度、数据源。
- Do NOT 把 enlargeTransitionMs 改到 300 以外。
- Do NOT 引入 Framer Motion。
- 二次对齐逻辑复杂：若现场代码与 70c4633 行号对不上，STOP 并报告，不要臆造第三条路径。

## Verification

- **Mechanical**: `rg "transition: all" frontend/components/home/DomeGallery.tsx` 为空；`rg "width \\$\\{enlargeTransitionMs\\}" frontend/components/home/DomeGallery.tsx` 为空。lint 通过。
- **Feel check**: `/` 点开 Dome 一张图。
  - 图从格子放大到中央，300ms，起步快，没有盒子慢慢拉宽的「液态」布局感。
  - 关闭沿反向缩回格子。
  - 连点打开/关闭：从当前变换继续，不要闪回 scale(0)。
  - Animations 10%：高亮只有 transform / opacity。
- **Done when**: 文件内零 `transition: all`，零盒模型尺寸过渡；放大关闭仍可用。
