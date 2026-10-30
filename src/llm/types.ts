import type { ZodType } from "zod";

// Provider-neutral tool and provider contracts. Adding OpenAI later means
// implementing LlmProvider in a new file; tools and the service do not change.
export type ToolDef = {
  name: string;
  description: string;
  schema: ZodType;
  // Receives raw, untrusted model arguments and must validate them.
  execute(args: unknown): Promise<unknown>;
};

// What the agent actually executed, independent of what the model said about it.
export type ToolCallTrace = {
  name: string;
  args: unknown;
  result: unknown;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  // Earlier tool results let the model resolve IDs ("complete the first one").
  toolCalls?: ToolCallTrace[];
};

export type RunResult = {
  text: string;
  toolCalls: ToolCallTrace[];
};

export interface LlmProvider {
  run(request: string, instructions: string, tools: ToolDef[], history?: ChatMessage[]): Promise<RunResult>;
}
