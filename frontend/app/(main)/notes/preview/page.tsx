import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

const sampleMarkdown = `# Streamdown 预览

这是一段 **Markdown** 预览，用来验证 \`streamdown\` 在当前项目的构建与样式是否正常。

## 列表

- 支持 GFM（表格/删除线/任务列表）
- 支持数学公式：$E = mc^2$

## 代码块

\`\`\`ts
export function hello(name: string) {
  return \`Hello, \${name}\`;
}
\`\`\`
`;

export default function NotesPreviewPage() {
  return (
    <div className="min-h-screen py-12 px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold mb-2">Markdown 预览</h1>
          <p className="text-foreground-secondary">
            使用 Streamdown 渲染 Markdown（静态模式）
          </p>
        </div>

        <div className="p-8 bg-background-secondary border border-white/10 rounded-2xl">
          <MarkdownRenderer
            markdown={sampleMarkdown}
            className="space-y-4 text-foreground"
          />
        </div>
      </div>
    </div>
  );
}

