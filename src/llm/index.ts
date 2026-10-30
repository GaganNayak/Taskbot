import { ConfigurationError } from "../errors";
import { GeminiProvider } from "./gemini";
import type { LlmProvider } from "./types";

// LLM_PROVIDER selects the backend; "openai" is reserved for a future provider.
export const createProvider = (env: NodeJS.ProcessEnv = process.env): LlmProvider => {
  const name = (env.LLM_PROVIDER ?? "gemini").toLowerCase();

  if (name !== "gemini") {
    throw new ConfigurationError(`LLM_PROVIDER "${name}" is not supported yet. Use "gemini".`);
  }

  if (!env.GEMINI_API_KEY) {
    throw new ConfigurationError("GEMINI_API_KEY is not configured. Copy .env.example to .env and add an API key.");
  }

  return GeminiProvider.fromApiKey(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined);
};
