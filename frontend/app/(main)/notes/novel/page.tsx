import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { NovelNativeEditor } from "@/components/notes/novel-native/NovelNativeEditor";

export default function NovelTryPage() {
  return (
    <div className="min-h-screen px-6 py-10 md:px-10">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-heading font-bold md:text-4xl">
              <Sparkles className="text-primary" size={30} />
              Novel 官方编辑器体验
            </h1>
            <p className="mt-2 text-foreground-secondary">
              已迁移官方 TailwindAdvancedEditor，并恢复 AI 气泡菜单（需配置 OPENAI_API_KEY）。
            </p>
          </div>

          <Link
            href="/notes"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/10"
          >
            <ArrowLeft size={16} />
            返回笔记列表
          </Link>
        </div>

        <NovelNativeEditor />
      </div>
    </div>
  );
}
