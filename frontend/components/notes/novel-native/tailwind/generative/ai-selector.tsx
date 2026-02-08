"use client";

import { useState } from "react";
import { useCompletion } from "ai/react";
import Markdown from "react-markdown";
import { ArrowUp } from "lucide-react";
import { addAIHighlight, useEditor } from "novel";
import { Command, CommandInput } from "../ui/command";
import { Button } from "../ui/button";
import CrazySpinner from "../ui/icons/crazy-spinner";
import Magic from "../ui/icons/magic";
import { ScrollArea } from "../ui/scroll-area";
import AICompletionCommands from "./ai-completion-command";
import AISelectorCommands from "./ai-selector-commands";

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getSelectionText = (editor: NonNullable<ReturnType<typeof useEditor>["editor"]>) => {
  const selection = editor.state.selection;
  return editor.state.doc.textBetween(selection.from, selection.to, "\n").trim();
};

export function AISelector({ onOpenChange }: AISelectorProps) {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/generate",
    onResponse: () => {
      setErrorMessage(null);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message);
    },
  });

  if (!editor) {
    return null;
  }

  const hasCompletion = completion.length > 0;

  const runCommand = (sourceText: string, option: string, command?: string) => {
    const normalized = sourceText.trim();
    if (!normalized) {
      setErrorMessage("请先选择文本，或输入需要生成的提示词。");
      return Promise.resolve();
    }

    return complete(normalized, {
      body: { option, command },
    }).then(() => {
      setInputValue("");
    });
  };

  return (
    <Command className="w-[350px]">
      {hasCompletion && (
        <div className="flex max-h-[400px]">
          <ScrollArea>
            <div className="prose prose-invert prose-sm p-2 px-4">
              <Markdown>{completion}</Markdown>
            </div>
          </ScrollArea>
        </div>
      )}

      {isLoading && (
        <div className="flex h-12 w-full items-center px-4 text-sm font-medium text-foreground-secondary text-purple-500">
          <Magic className="mr-2 h-4 w-4 shrink-0" />
          AI is thinking
          <div className="ml-2 mt-1">
            <CrazySpinner />
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="relative">
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              autoFocus
              placeholder={hasCompletion ? "Tell AI what to do next" : "Ask AI to edit or generate..."}
              onFocus={() => addAIHighlight(editor)}
            />
            <Button
              size="icon"
              className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-purple-500 hover:bg-purple-900"
              onClick={() => {
                if (hasCompletion) {
                  void runCommand(completion, "zap", inputValue);
                  return;
                }

                const selectedText = getSelectionText(editor);
                const sourceText = selectedText || editor.getText();
                void runCommand(sourceText, "zap", inputValue);
              }}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          {errorMessage ? <p className="px-4 py-2 text-xs text-red-400">{errorMessage}</p> : null}

          {hasCompletion ? (
            <AICompletionCommands
              completion={completion}
              onDiscard={() => {
                editor.chain().unsetHighlight().focus().run();
                onOpenChange(false);
              }}
            />
          ) : (
            <AISelectorCommands
              onSelect={(value, option) => {
                void runCommand(value, option);
              }}
            />
          )}
        </>
      )}
    </Command>
  );
}
