import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

type GenerateOption = "continue" | "improve" | "shorter" | "longer" | "fix" | "zap";

const SYSTEM_PROMPTS: Record<GenerateOption, string> = {
  continue:
    "You are an AI writing assistant. Continue the existing text using the latest context. Keep it concise and coherent. Use Markdown when appropriate.",
  improve:
    "You are an AI writing assistant. Improve clarity, fluency, and structure while preserving the original meaning. Use Markdown when appropriate.",
  shorter:
    "You are an AI writing assistant. Rewrite the text to be shorter while preserving key information. Use Markdown when appropriate.",
  longer:
    "You are an AI writing assistant. Expand the text with useful details while keeping style consistent. Use Markdown when appropriate.",
  fix:
    "You are an AI writing assistant. Fix grammar, spelling, and punctuation while preserving meaning. Use Markdown when appropriate.",
  zap:
    "You are an AI writing assistant. Follow the user command to transform or generate text based on the provided context. Use Markdown when appropriate.",
};

const normalizeOption = (value: unknown): GenerateOption => {
  if (typeof value !== "string") {
    return "continue";
  }

  if (["continue", "improve", "shorter", "longer", "fix", "zap"].includes(value)) {
    return value as GenerateOption;
  }

  return "continue";
};

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(req: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const prompt = toText(payload.prompt);
  const option = normalizeOption(payload.option);
  const command = toText(payload.command);

  if (!prompt) {
    return new Response("Prompt is required", { status: 400 });
  }

  const userPrompt = option === "zap" && command
    ? `Context:\n${prompt}\n\nCommand:\n${command}`
    : prompt;

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    system: SYSTEM_PROMPTS[option],
    prompt: userPrompt,
    temperature: 0.7,
    maxTokens: 512,
  });

  return result.toDataStreamResponse();
}
