# LumiHarbor 前端动效计划

相对 commit `70c4633`。执行器零上下文即可按单份 markdown 改；不要发明曲线，值已写死。

| # | 标题 | Severity | Status | 依赖 |
| --- | --- | --- | --- | --- |
| 010 | 抽出动效 token 并删掉未用的 0.8s fade-in | MEDIUM | DONE | — |
| 007 | 为位移与常驻 WebGL 接上 prefers-reduced-motion | HIGH | DONE | 010 建议先 |
| 002 | 把瀑布流入场从 800ms 营销秀收成 200ms UI | HIGH | DONE | 010 建议先 |
| 003 | 瀑布流只动画 transform/opacity | HIGH | DONE | 002 |
| 001 | 去掉素材卡高频 3D 倾斜 | HIGH | DONE | — |
| 004 | 拖拽时关掉 ImageViewer 的 transform 过渡 | HIGH | DONE | — |
| 005 | DomeGallery 放大只过渡 transform 和 opacity | HIGH | DONE | — |
| 006 | Dock 指示条用 translateY | HIGH | DONE | — |
| 008 | Dock tooltip 去 ease-in，后续 instant | MEDIUM | DONE | 006 |
| 009 | Hover 位移/缩放只在细指针设备生效 | MEDIUM | DONE | 001、010 |
| 011 | 高频 UI 去掉 transition-all | MEDIUM | DONE | 006（Dock 那处） |
| 012 | 地图足迹抽屉改用可打断的 transition | MEDIUM | DONE | — |

## 建议顺序

```text
010 → 007 → 002 → 003 → 001 → 009
010 → 006 → 008 → 011
004、005、012 可与上面并行
```

同文件不要两人同时改：

- `AssetMasonry.tsx` / `AlbumMasonry.tsx`：先 002 再 003（007 若已改减动分支，003 保留 `gsap.set` 短路）。
- `DockNavigation.tsx`：先 006 再 008（007 可能已改滑入 set）。
- `globals.css`：010 加 token；007 加 reduce media；009 加 hover utility。后写的人追加，不要删别人的 `:root` 变量。

## 不要动

- `frontend/components/notes/novel-native/**` 的第三方皮肤（除非某份计划点名）。
- 首页粒子/BlurText/Dome **作为功能**是否存在（设计文档已定）；只按 005/007 改实现。
- 不要新增动画库。

## 跑完怎么验

每份计划底部有 Mechanical + Feel check。整包结束后至少：

1. `npm --prefix frontend run lint`
2. `/` Dome 放大、`/assets` 列表、桌面 Dock、`/map` 抽屉、素材详情拖图
3. DevTools `prefers-reduced-motion: reduce` 再走一遍上述路径
