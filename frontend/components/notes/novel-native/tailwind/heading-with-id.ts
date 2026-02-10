import { Heading } from '@tiptap/extension-heading';
import { mergeAttributes } from '@tiptap/core';

/**
 * 生成标题 ID
 * 规则：将文本转换为小写，替换空格为连字符，移除特殊字符
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .substring(0, 50) + '-' + Date.now().toString(36);
}

/**
 * 扩展 Heading 节点，为每个标题添加唯一 ID
 * 用于目录跳转功能
 */
export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {};
          }
          return { id: attributes.id };
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // 当创建标题时，自动生成 ID
      Enter: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // 检查当前节点是否是标题
        if ($from.parent.type.name === 'heading') {
          // 为当前标题生成 ID（如果没有）
          const currentNode = $from.parent;
          if (!currentNode.attrs.id) {
            const text = currentNode.textContent;
            const id = generateHeadingId(text);
            editor.commands.updateAttributes('heading', { id });
          }
        }

        return false; // 继续默认行为
      },
    };
  },
});
