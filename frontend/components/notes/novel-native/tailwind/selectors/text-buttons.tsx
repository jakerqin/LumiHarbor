import { BoldIcon, CodeIcon, ItalicIcon, StrikethroughIcon, UnderlineIcon } from "lucide-react";
import { EditorBubbleItem, useEditor } from "novel";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import type { SelectorItem } from "./node-selector";

export const TextButtons = () => {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  const items: SelectorItem[] = [
    {
      name: "bold",
      isActive: (currentEditor) => currentEditor.isActive("bold"),
      command: (currentEditor) => currentEditor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: (currentEditor) => currentEditor.isActive("italic"),
      command: (currentEditor) => currentEditor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: (currentEditor) => currentEditor.isActive("underline"),
      command: (currentEditor) => currentEditor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      isActive: (currentEditor) => currentEditor.isActive("strike"),
      command: (currentEditor) => currentEditor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: "code",
      isActive: (currentEditor) => currentEditor.isActive("code"),
      command: (currentEditor) => currentEditor.chain().focus().toggleCode().run(),
      icon: CodeIcon,
    },
  ];

  return (
    <div className="flex">
      {items.map((item) => (
        <EditorBubbleItem
          key={item.name}
          onSelect={(currentEditor) => {
            item.command(currentEditor);
          }}
        >
          <Button size="sm" className="rounded-none" variant="ghost" type="button">
            <item.icon
              className={cn("h-4 w-4", {
                "text-blue-500": item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};
