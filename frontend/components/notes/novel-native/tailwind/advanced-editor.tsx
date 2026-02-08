"use client";

import hljs from "highlight.js";
import { useState } from "react";
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
import { defaultEditorContent } from "@/components/notes/novel-native/content";
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

const STORAGE_KEYS = {
  content: "novel-native-content",
  html: "novel-native-html",
};

const extensions = [...defaultExtensions, slashCommand];

const highlightCodeblocks = (content: string) => {
  const doc = new DOMParser().parseFromString(content, "text/html");
  doc.querySelectorAll("pre code").forEach((el) => {
    hljs.highlightElement(el as HTMLElement);
  });
  return new XMLSerializer().serializeToString(doc);
};

const resolveInitialContent = (): JSONContent => {
  if (typeof window === "undefined") {
    return defaultEditorContent as JSONContent;
  }

  const content = window.localStorage.getItem(STORAGE_KEYS.content);
  if (!content) {
    return defaultEditorContent as JSONContent;
  }

  try {
    return JSON.parse(content) as JSONContent;
  } catch {
    return defaultEditorContent as JSONContent;
  }
};

const TailwindAdvancedEditor = () => {
  const [initialContent] = useState<JSONContent>(resolveInitialContent);
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Unsaved">("Saved");
  const [charsCount, setCharsCount] = useState<number | null>(null);

  const [openNode, setOpenNode] = useState(false);
  const [openColor, setOpenColor] = useState(false);
  const [openLink, setOpenLink] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  const debouncedUpdates = useDebouncedCallback((editor: EditorInstance) => {
    const json = editor.getJSON();
    setCharsCount(editor.storage.characterCount.words());
    window.localStorage.setItem(STORAGE_KEYS.html, highlightCodeblocks(editor.getHTML()));
    window.localStorage.setItem(STORAGE_KEYS.content, JSON.stringify(json));
    setSaveStatus("Saved");
  }, 500);

  return (
    <div className="relative w-full max-w-screen-lg">
      <div className="absolute right-5 top-5 z-10 mb-5 flex gap-2">
        <div className="rounded-lg bg-white/10 px-2 py-1 text-sm text-foreground-secondary">{saveStatus}</div>
        <div className={charsCount ? "rounded-lg bg-white/10 px-2 py-1 text-sm text-foreground-secondary" : "hidden"}>
          {charsCount} Words
        </div>
      </div>

      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full max-w-screen-lg border-muted bg-background sm:mb-[calc(20vh)] sm:rounded-lg sm:border sm:shadow-lg"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
            handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, uploadFn),
            attributes: {
              class: "prose prose-lg prose-invert prose-headings:font-heading focus:outline-none max-w-full",
            },
          }}
          onUpdate={({ editor }) => {
            debouncedUpdates(editor);
            setSaveStatus("Unsaved");
          }}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-foreground-secondary">No results</EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  key={item.title}
                  value={item.title}
                  onCommand={(props) => item.command?.(props)}
                  className="flex w-full items-center space-x-2 rounded-md px-2 py-1 text-left text-sm hover:bg-white/10 aria-selected:bg-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-foreground-secondary">{item.description}</p>
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
    </div>
  );
};

export default TailwindAdvancedEditor;
