---
title: Markdown 与素材协议
nav_title: Markdown与素材协议
description: 旧 Markdown / asset:// / Streamdown 路径已删除；笔记主存 Novel JSON。
order: 11
---

# Markdown 与素材协议

主笔记流是 Novel / Tiptap JSON。`MarkdownRenderer`、`asset://` 协议、`streamdown` 依赖已删除。

插入素材时节点 `attrs.src` 为绝对媒体 URL，`attrs.assetId` 为数字 id。不要再按 Markdown + `asset://` 实现主编辑器。
