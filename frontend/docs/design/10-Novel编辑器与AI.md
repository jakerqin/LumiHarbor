---
title: Novel 编辑器与 AI
nav_title: Novel编辑器与AI
description: novel-native 包结构、主笔记接线方式，以及 /api/generate AI 气泡菜单边界。
order: 10
---

# Novel 编辑器与 AI

## 职责边界

- **负责**：Tiptap/Novel 高级编辑体验（Slash、Bubble、扩展）、正文内插素材、Ask AI 流式生成
- **不负责**：笔记列表/CRUD 编排（见 [笔记](./09-笔记.md)）；OpenAI 密钥下发到浏览器

## 重要结论：不再是「独立实验页」

| 旧状态（CLAUDE.md） | 当前源码 |
|---|---|
| `/notes/novel` 体验页 | **路由不存在** |
| localStorage 持久化 demo | 主路径改为 `onSave` → `notesApi` |
| 「尚未接入 Notes CRUD」 | **已接入**新建页与详情页 |

[`NovelNativeEditor.tsx`](../../components/notes/novel-native/NovelNativeEditor.tsx) 仍是薄包装（提示文案 + `TailwindAdvancedEditor`），**无页面引用**；实际入口是：

- [`NoteEditor`](../../components/notes/NoteEditor.tsx)（新建）
- [`notes/[id]/page.tsx`](../../app/(main)/notes/[id]/page.tsx)（详情）

直接 import `TailwindAdvancedEditor`。

## 目录约定

```text
components/notes/novel-native/
├── NovelNativeEditor.tsx          # 未接线的薄包装
├── TableOfContents.tsx
├── hooks/useTableOfContents.ts
├── content.ts
└── tailwind/
    ├── advanced-editor.tsx        # 主编辑器
    ├── extensions.ts
    ├── slash-command.tsx
    ├── image-upload.ts            # 粘贴/拖拽图片（DataURL 路径）
    ├── video-extension.ts
    ├── heading-with-id.ts
    ├── generative/                # Ask AI 气泡
    ├── selectors/                 # 节点/链接/颜色/数学/文本
    └── ui/                        # Radix/cmdk 基元
```

样式：`app/globals.css` 引入 `styles/prosemirror.css` + KaTeX；编辑区使用 `editor-light-theme`（白底），与全站深色壳形成对比。

## 编辑器行为

[`advanced-editor.tsx`](../../components/notes/novel-native/tailwind/advanced-editor.tsx)：

```text
EditorRoot / EditorContent
  extensions = defaultExtensions + slashCommand
  onUpdate → debounce 500ms → onSave(json)（若 autoSave）
  Bubble: GenerativeMenuSwitch + Node/Link/Math/Text/Color
  Slash: suggestionItems（含打开素材选择器）
  slotAfter: ImageResizer
  侧栏: TableOfContents
```

### 插入素材库资源

```text
slash / window.openAssetPicker(editor)
  → AssetPickerModal
  → resolveMediaUrl(preview_url || original_url)
  → insert image | video 节点（attrs: src, assetId）
```

粘贴/拖拽本地图仍走 `image-upload.ts`（偏 DataURL 体验），与素材库插入是两条路径。

### 自动保存分层

| 层 | 防抖 | 职责 |
|---|---|---|
| `TailwindAdvancedEditor` | 500ms | 把 JSON 交给 `onSave` |
| `NoteEditor`（新建） | 额外 2s | 合并标题/封面后调 `notesApi` |
| 详情页 `updateMutation` | 跟编辑器 500ms | 只更新 content + markdown |

## AI：`POST /api/generate`

实现：[`app/api/generate/route.ts`](../../app/api/generate/route.ts)

```text
浏览器 Novel Ask AI
  → POST /api/generate  { prompt, option, command? }
  → 校验 OPENAI_API_KEY
  → streamText(openai gpt-4o-mini, system by option)
  → toDataStreamResponse()
```

| option | 语义 |
|---|---|
| continue / improve / shorter / longer / fix | 固定 system prompt |
| zap | 附加用户 command |

边界：

- Key 仅服务端；缺失返回 400 `Missing OPENAI_API_KEY`
- `maxTokens: 512`，温度 0.7
- **不**经过 `apiClient` / 后端 FastAPI
- 无鉴权：任何能访问前端源站的人都能打该路由（个人项目可接受，暴露公网前需加保护）

## 设计决策

### 为什么先独立体验再并入主路径？

降低一次性替换 Markdown 编辑器的风险。当前已完成并入；文档应停止称「实验未接线」。

### 为什么 AI 走 Next Route 而不是后端？

密钥与 Vercel AI SDK 流式响应更贴近前端编辑器；后端暂无写作助手领域模型。代价是部署前端时必须配置 `OPENAI_API_KEY`。

### 为什么未启用 MarkdownExtension？

`novel@1.0.2` 未导出该扩展；用 `jsonToMarkdown` 在应用层生成副本，避免版本不兼容。

## 依赖

```text
novel, ai, @ai-sdk/openai, cmdk, Radix UI, lowlight/highlight.js, use-debounce
→ TailwindAdvancedEditor
→ notes pages / NoteEditor
→ /api/generate（仅 AI）
```

## 已知限制

- `NovelNativeEditor` 死代码包装可删可留；勿再新建 `/notes/novel` 除非有意做 playground。
- `window.openAssetPicker` 全局挂载，多编辑器实例并存时需小心。
- DataURL 粘贴图可能把大体量 base64 写入 JSON content。
- AI 路由无用户/配额限制。
