"use client";

import { useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import {
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  type EditorInstance,
  EditorRoot,
  ImageResizer,
  type JSONContent,
  handleCommandNavigation,
  handleImageDrop,
  handleImagePaste,
} from "novel";
import { defaultExtensions } from "./extensions";
import { uploadFn } from "./image-upload";
import GenerativeMenuSwitch from "./generative/generative-menu-switch";
import { ColorSelector } from "./selectors/color-selector";
import { LinkSelector } from "./selectors/link-selector";
import { MathSelector } from "./selectors/math-selector";
import { NodeSelector } from "./selectors/node-selector";
import { TextButtons } from "./selectors/text-buttons";
import { slashCommand, suggestionItems } from "./slash-command";
import { Separator } from "./ui/separator";
import { AssetPickerModal } from "@/components/common/AssetPickerModal";
import type { Asset } from "@/lib/api/types";
import { resolveMediaUrl } from "@/lib/utils/mediaUrl";
import { TableOfContents } from "../TableOfContents";

const extensions = [...defaultExtensions, slashCommand];

interface TailwindAdvancedEditorProps {
  initialContent?: JSONContent;
  onSave?: (content: JSONContent) => void | Promise<void>;
  autoSave?: boolean;
}

const TailwindAdvancedEditor = ({
  initialContent,
  onSave,
  autoSave = true,
}: TailwindAdvancedEditorProps) => {
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Unsaved">("Saved");
  const [charsCount, setCharsCount] = useState<number | null>(null);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const editorRef = useRef<EditorInstance | null>(null);
  const [editor, setEditor] = useState<EditorInstance | null>(null); // 用于目录组件

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  // 将打开素材选择器的函数挂载到 window 上
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).openAssetPicker = (editor: EditorInstance) => {
        editorRef.current = editor;
        setIsAssetPickerOpen(true);
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).openAssetPicker;
      }
    };
  }, []);

  const handleAssetSelect = (asset: Asset) => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    // 优先使用 preview_url（转码后的 WebP 格式，用于 HEIC 等特殊格式）
    // 如果不存在 preview_url，则使用 original_url（原生支持的格式如 JPG、PNG）
    const urlToUse = asset.preview_url || asset.original_url;
    const assetUrl = resolveMediaUrl(urlToUse, asset.original_path) || '';

    // 根据素材类型插入不同的节点
    if (asset.asset_type === 'video') {
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'video',
            attrs: {
              src: assetUrl,
              assetId: asset.id,
            },
          },
          {
            type: 'paragraph',
          },
        ])
        .run();
    } else {
      // 图片类型
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: 'image',
            attrs: {
              src: assetUrl,
              assetId: asset.id,
            },
          },
          {
            type: 'paragraph',
          },
        ])
        .run();
    }
  };

  const debouncedUpdates = useDebouncedCallback(async (editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.characters());

    if (autoSave && onSave) {
      await onSave(json);
    }

    setSaveStatus("Saved");
  }, 500);

  return (
    <div className="relative w-full editor-dark-theme">
      <div className="absolute right-12 top-5 z-10 mb-5 flex gap-2">
        <div className="rounded-lg bg-background-tertiary px-2 py-1 text-sm text-foreground-secondary">
          {saveStatus === "Saved" ? "已保存" : "未保存"}
        </div>
        <div
          className={
            charsCount
              ? "rounded-lg bg-background-tertiary px-2 py-1 text-sm text-foreground-secondary tabular-nums"
              : "hidden"
          }
        >
          {charsCount} 字符
        </div>
      </div>

      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full pb-[calc(20vh)]"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class:
                "prose prose-lg prose-invert prose-headings:font-heading prose-headings:text-foreground prose-p:text-foreground/90 prose-a:text-primary focus:outline-none max-w-full",
            },
          }}
          onCreate={({ editor }) => {
            setEditor(editor);
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-white/10 bg-background-secondary px-1 py-2 shadow-lg transition-all">
            <EditorCommandEmpty className="px-2 text-foreground-tertiary">无结果</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(props) => item.command?.(props)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm text-foreground hover:bg-white/5 aria-selected:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-background-tertiary">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-foreground-tertiary">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <GenerativeMenuSwitch open={openAI} onOpenChange={setOpenAI}>
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <MathSelector />
            <Separator orientation="vertical" />
            <TextButtons />
            <Separator orientation="vertical" />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </GenerativeMenuSwitch>
        </EditorContent>
      </EditorRoot>

      <AssetPickerModal
        open={isAssetPickerOpen}
        title="选择素材"
        description="从素材库中选择图片插入到笔记"
        onClose={() => setIsAssetPickerOpen(false)}
        onSelect={handleAssetSelect}
      />

      {/* 目录侧边栏 */}
      <TableOfContents editor={editor} />
    </div>
  );
};

export default TailwindAdvancedEditor;
