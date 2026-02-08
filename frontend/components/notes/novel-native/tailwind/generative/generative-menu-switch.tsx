import { Fragment, type ReactNode, useEffect } from "react";
import { EditorBubble, removeAIHighlight, useEditor } from "novel";
import { Button } from "../ui/button";
import Magic from "../ui/icons/magic";
import { AISelector } from "./ai-selector";

interface GenerativeMenuSwitchProps {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GenerativeMenuSwitch = ({ children, open, onOpenChange }: GenerativeMenuSwitchProps) => {
  const { editor } = useEditor();

  useEffect(() => {
    if (!open && editor) {
      removeAIHighlight(editor);
    }
  }, [editor, open]);

  if (!editor) {
    return null;
  }

  return (
    <EditorBubble
      tippyOptions={{
        placement: open ? "bottom-start" : "top",
        onHidden: () => {
          onOpenChange(false);
          editor.chain().unsetHighlight().run();
        },
      }}
      className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-muted bg-background shadow-xl"
    >
      {open ? <AISelector open={open} onOpenChange={onOpenChange} /> : null}
      {!open ? (
        <Fragment>
          <Button className="gap-1 rounded-none text-purple-500" variant="ghost" size="sm" onClick={() => onOpenChange(true)}>
            <Magic className="h-5 w-5" />
            Ask AI
          </Button>
          {children}
        </Fragment>
      ) : null}
    </EditorBubble>
  );
};

export default GenerativeMenuSwitch;
