"use client";

import TailwindAdvancedEditor from "./tailwind/advanced-editor";

export function NovelNativeEditor() {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-foreground-secondary backdrop-blur">
        已恢复官方 AI 气泡菜单：选中文本后点击 <span className="text-foreground">Ask AI</span>，可进行润色、纠错、扩写、续写。
      </div>
      <TailwindAdvancedEditor />
    </div>
  );
}
