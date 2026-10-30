import { GoogleGenAI, type Content, type GenerateContentResponse } from "@google/genai";
import { z } from "zod";

import type { ChatMessage, LlmProvider, RunResult, ToolCallTrace, ToolDef } from "./types";

export const MAX_AGENT_TURNS = 6;
export const REQUEST_TIMEOUT_MS = 30_000;
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export class AgentLimitError extends Error {
  constructor() {
    super("The request exceeded the agent execution limit. Please try a simpler request.");
    this.name = "AgentLimitError";
  }
}

// The slice of the SDK we use, so tests can inject a fake.
export type GeminiClient = {
  models: {
    generateContent(params: {
      model: string;
      contents: Content[];
      config: Record<string, unknown>;
    }): Promise<GenerateContentResponse>;
  };
};

export class GeminiProvider implements LlmProvider {
  constructor(
    private readonly client: GeminiClient,
    private readonly model: string = DEFAULT_GEMINI_MODEL,
    private readonly maxTurns: number = MAX_AGENT_TURNS,
  ) {}

  static fromApiKey(apiKey: string, model?: string): GeminiProvider {
    return new GeminiProvider(new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } }) as unknown as GeminiClient, model);
  }

  // One retry on rate-limit/server errors; the API is occasionally flaky.
  private async generate(
    params: Parameters<GeminiClient["models"]["generateContent"]>[0],
  ): Promise<GenerateContentResponse> {
    try {
      return await this.client.models.generateContent(params);
    } catch (error) {
      if (!isTransient(error)) {
        throw error;
      }

      return this.client.models.generateContent(params);
    }
  }

  async run(
    request: string,
    instructions: string,
    tools: ToolDef[],
    history: ChatMessage[] = [],
  ): Promise<RunResult> {
    const toolCalls: ToolCallTrace[] = [];
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const config = {
      systemInstruction: instructions + toolContext(history),
      automaticFunctionCalling: { disable: true },
      tools: [
        {
          functionDeclarations: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parametersJsonSchema: toParametersSchema(tool),
          })),
        },
      ],
    };
    const contents: Content[] = [...historyToContents(history), { role: "user", parts: [{ text: request }] }];

    for (let turn = 0; turn < this.maxTurns; turn += 1) {
      const response = await this.generate({ model: this.model, contents, config });
      const calls = response.functionCalls ?? [];

      if (calls.length === 0) {
        return {
          text: stripToolNote(response.text ?? "") || "I could not produce a response for that request.",
          toolCalls,
        };
      }

      contents.push(response.candidates?.[0]?.content ?? { role: "model", parts: [] });

      const parts = [];
      for (const call of calls) {
        const tool = byName.get(call.name ?? "");
        // Unregistered tool names are never executed.
        const result = tool
          ? await tool.execute(call.args)
          : { ok: false, error: `Unknown tool "${call.name}".` };

        toolCalls.push({ name: call.name ?? "", args: call.args, result });
        parts.push({ functionResponse: { name: call.name, response: result as Record<string, unknown> } });
      }
      contents.push({ role: "user", parts });
    }

    throw new AgentLimitError();
  }
}

const MAX_TOOL_CONTEXT_CHARS = 3000;

// Older versions of the UI stored a "[Tool results ...]" note inside assistant text.
// Strip it from history and from output so it can never be echoed to the user.
export const stripToolNote = (text: string): string =>
  text.replace(/\s*\[Tool results from this turn:[\s\S]*$/, "").trim();

// Earlier tool results go in the system instruction, not in the model's own turns:
// replayed as model text, the model copies the format into its replies.
const toolContext = (history: ChatMessage[]): string => {
  const results = history
    .flatMap((message) => (message.role === "assistant" ? (message.toolCalls ?? []) : []))
    .map(({ name, result }) => ({ name, result }));

  return results.length
    ? `

Reference data from earlier in this conversation (tool results, useful for finding task IDs). Never print, quote, or mention this block:
${JSON.stringify(results).slice(-MAX_TOOL_CONTEXT_CHARS)}`
    : "";
};

const historyToContents = (history: ChatMessage[]): Content[] =>
  history
    .map((message): Content => ({
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: stripToolNote(message.text) }],
    }))
    // A conversation must start with a user turn.
    .filter((_content, index, all) => all.slice(0, index + 1).some((content) => content.role === "user"));

const isTransient =(error: unknown): boolean => {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" && (status === 429 || status >= 500);
};

const toParametersSchema = (tool: ToolDef): unknown => {
  const { $schema: _ignored, ...schema } = z.toJSONSchema(tool.schema) as Record<string, unknown>;
  return schema;
};
