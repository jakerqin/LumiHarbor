/**
 * 将 Tiptap JSONContent 转换为 Markdown 格式
 * 用于生成笔记预览内容
 */

import type { JSONContent } from 'novel';

/**
 * 将 JSONContent 转换为 Markdown
 */
export function jsonToMarkdown(content: JSONContent): string {
  if (!content) return '';

  const lines: string[] = [];

  function processNode(node: JSONContent, listDepth = 0): void {
    const { type, content: children, text, marks, attrs } = node;

    switch (type) {
      case 'doc':
        // 文档根节点，处理子节点
        children?.forEach(child => processNode(child, listDepth));
        break;

      case 'paragraph':
        // 段落
        const paragraphText = processChildren(children, marks);
        if (paragraphText.trim()) {
          lines.push(paragraphText);
          lines.push(''); // 段落后添加空行
        }
        break;

      case 'heading':
        // 标题
        const level = attrs?.level || 1;
        const headingText = processChildren(children, marks);
        lines.push(`${'#'.repeat(level)} ${headingText}`);
        lines.push('');
        break;

      case 'bulletList':
        // 无序列表
        children?.forEach(child => processNode(child, listDepth));
        if (listDepth === 0) lines.push('');
        break;

      case 'orderedList':
        // 有序列表
        let index = attrs?.start || 1;
        children?.forEach(child => {
          processOrderedListItem(child, index++, listDepth);
        });
        if (listDepth === 0) lines.push('');
        break;

      case 'listItem':
        // 列表项（无序）
        const indent = '  '.repeat(listDepth);
        const itemText = processChildren(children, marks);
        lines.push(`${indent}- ${itemText}`);
        break;

      case 'blockquote':
        // 引用块
        children?.forEach(child => {
          const quoteText = processChildren(child.content, marks);
          lines.push(`> ${quoteText}`);
        });
        lines.push('');
        break;

      case 'codeBlock':
        // 代码块
        const language = attrs?.language || '';
        const codeText = processChildren(children, marks);
        lines.push(`\`\`\`${language}`);
        lines.push(codeText);
        lines.push('```');
        lines.push('');
        break;

      case 'horizontalRule':
        // 分隔线
        lines.push('---');
        lines.push('');
        break;

      case 'hardBreak':
        // 硬换行
        lines.push('  ');
        break;

      case 'text':
        // 纯文本节点（不应该直接到这里，应该在 processChildren 中处理）
        break;

      default:
        // 未知节点类型，尝试处理子节点
        children?.forEach(child => processNode(child, listDepth));
        break;
    }
  }

  function processOrderedListItem(node: JSONContent, index: number, listDepth: number): void {
    const indent = '  '.repeat(listDepth);
    const itemText = processChildren(node.content, node.marks);
    lines.push(`${indent}${index}. ${itemText}`);
  }

  function processChildren(children: JSONContent[] | undefined, parentMarks?: any[]): string {
    if (!children) return '';

    return children.map(child => {
      if (child.type === 'text') {
        return applyMarks(child.text || '', child.marks || parentMarks);
      } else if (child.type === 'hardBreak') {
        return '  \n';
      } else {
        // 递归处理嵌套节点
        return processChildren(child.content, child.marks || parentMarks);
      }
    }).join('');
  }

  function applyMarks(text: string, marks?: any[]): string {
    if (!marks || marks.length === 0) return text;

    let result = text;

    // 按优先级应用标记
    marks.forEach(mark => {
      switch (mark.type) {
        case 'bold':
          result = `**${result}**`;
          break;
        case 'italic':
          result = `*${result}*`;
          break;
        case 'code':
          result = `\`${result}\``;
          break;
        case 'strike':
          result = `~~${result}~~`;
          break;
        case 'link':
          const href = mark.attrs?.href || '';
          result = `[${result}](${href})`;
          break;
        default:
          break;
      }
    });

    return result;
  }

  processNode(content);

  // 移除末尾多余的空行
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}
