---
title: Markdown 与素材协议
nav_title: Markdown与素材协议
description: Streamdown 包装与 asset:// 协议的遗留实现；说明与主笔记流的关系。
order: 11
---

# Markdown 与素材协议

## 职责边界

- **负责**：提供 Streamdown 渲染封装；定义 `asset://{id}` ↔ `/__asset__/{id}` 改写工具
- **当前业务消费**：**无页面引用**（主笔记已迁 Novel JSON）
- **保留原因**：兼容旧文档/可能的 Markdown 预览需求；避免协议逻辑散落

关键文件：

- [`components/markdown/MarkdownRenderer.tsx`](../../components/markdown/MarkdownRenderer.tsx)
- [`lib/markdown/assetProtocol.ts`](../../lib/markdown/assetProtocol.ts)

## Streamdown 包装

```text
MarkdownRenderer
  → <Streamdown mode="static" controls={false} cdnUrl={null} ...>
```

透传 `components` / `remarkPlugins`，便于挂载 `remarkRewriteAssetProtocolUrls`。

`tailwind.config.ts` 的 `content` 包含 `streamdown` 包路径，防止样式被 purge。

## asset:// 协议

| 形态 | 含义 |
|---|---|
| 存储意图（旧） | Markdown 内 `![](asset://123)` |
| 渲染改写 | `asset://123` → `/__asset__/123` |
| 解析 | `parseAssetIdFromUri` 同时认协议与 proxy path |

**为什么改写**：Streamdown / rehype-harden 会拦截自定义协议图片；同源 path 可绕过。

```text
remarkRewriteAssetProtocolUrls()
  walk mdast tree
    if node.url matches asset://{id}
      rewrite → /__asset__/{id}
```

前端**没有**实现 `/__asset__/[id]` 的 Next rewrite/proxy 路由；即便渲染出该 path，仍需额外页面或中间件把它映射到真实媒体 URL。旧方案依赖自定义 `components.img` 识别 id 再查素材——相关 `NoteMarkdown` / `AssetEmbed` **已不在仓库**。

## 与主笔记流的关系

```text
当前主路径（Novel）
  插入素材 → image/video 节点 attrs.src = 绝对媒体 URL
           → attrs.assetId = 数字 id（编辑器内）

遗留 Markdown 路径（未接线）
  asset:// → proxy path → （缺失的）解析/嵌入组件
```

保存时仍生成 `content_markdown`（`jsonToMarkdown`），但**不保证**含 `asset://`，也不走 Streamdown 预览。

## 设计决策

### 为什么文档还单独成篇？

协议与 Streamdown 仍是可运行的库代码，半年后若有人「恢复 Markdown 预览」或对接导出，需要知道 why 与缺口；同时明确**不要**再按 CLAUDE.md 旧描述实现主编辑器。

## 已知限制 / 缺口

- 无业务页 import `MarkdownRenderer`。
- 无 `/__asset__/*` 路由或 middleware。
- 无 `AssetEmbed` 组件。
- 与后端「不做 related_assets / include_assets」的现状一致；前后端都已离开旧 Markdown 协议主线。

若重新启用：至少补齐 proxy/解析层、嵌入组件，并决定存储真相是 JSON 还是 Markdown。
