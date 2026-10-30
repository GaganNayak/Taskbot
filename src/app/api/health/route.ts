import { DEFAULT_GEMINI_MODEL } from "@/llm/gemini";
import { BUSINESS_TIME_ZONE } from "@/services/task-service";

export const dynamic = "force-dynamic";

export const GET = () =>
  Response.json({
    provider: (process.env.LLM_PROVIDER ?? "gemini").toLowerCase(),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    keyConfigured: Boolean(process.env.GEMINI_API_KEY),
    timeZone: BUSINESS_TIME_ZONE,
  });
