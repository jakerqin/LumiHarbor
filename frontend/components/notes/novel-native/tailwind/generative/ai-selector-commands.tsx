import { ArrowDownWideNarrow, CheckCheck, RefreshCcwDot, StepForward, WrapText } from "lucide-react";
import { useEditor } from "novel";
import { CommandGroup, CommandItem, CommandSeparator } from "../ui/command";

const options = [
  {
    value: "improve",
    label: "Improve writing",
    icon: RefreshCcwDot,
  },
  {
    value: "fix",
    label: "Fix grammar",
    icon: CheckCheck,
  },
  {
    value: "shorter",
    label: "Make shorter",
    icon: ArrowDownWideNarrow,
  },
  {
    value: "longer",
    label: "Make longer",
    icon: WrapText,
  },
];

interface AISelectorCommandsProps {
  onSelect: (value: string, option: string) => void;
}

const AISelectorCommands = ({ onSelect }: AISelectorCommandsProps) => {
  const { editor } = useEditor();

  if (!editor) {
    return null;
  }

  return (
    <>
      <CommandGroup heading="Edit or review selection">
        {options.map((option) => (
          <CommandItem
            key={option.value}
            value={option.value}
            className="flex gap-2 px-4"
            onSelect={(value) => {
              const selection = editor.state.selection;
              const text = editor.state.doc.textBetween(selection.from, selection.to, "\n").trim();
              onSelect(text || editor.getText(), value);
            }}
          >
            <option.icon className="h-4 w-4 text-purple-500" />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Use AI to do more">
        <CommandItem
          value="continue"
          className="gap-2 px-4"
          onSelect={() => {
            const context = editor.getText().slice(-2000);
            onSelect(context, "continue");
          }}
        >
          <StepForward className="h-4 w-4 text-purple-500" />
          Continue writing
        </CommandItem>
      </CommandGroup>
    </>
  );
};

export default AISelectorCommands;
