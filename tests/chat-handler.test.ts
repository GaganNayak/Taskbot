import { describe, expect, it } from "vitest";

import { ConfigurationError, ModelServiceError } from "../src/errors";
import { AgentLimitError } from "../src/llm/gemini";
import type { LlmProvider } from "../src/llm/types";
import { chatHandler } from "../src/lib/handlers";
import { createRateLimiter } from "../src/lib/rate-limit";
import { TaskService } from "../src/services/task-service";
import { fixedNow, MemoryTaskRepository } from "./helpers";

const post = (body: unknown) => new Request("http://x/api/chat", { method: "POST", body: JSON.stringify(body) });
const service = () => new TaskService(new MemoryTaskRepository(), fixedNow);
const providerReturning = (text = "hi"): LlmProvider => ({
  run: async () => ({ text, toolCalls: [{ name: "list_tasks", args: {}, result: { ok: true, tasks: [] } }] }),
});
const providerThrowing = (error: Error): LlmProvider => ({
  run: async () => {
    throw error;
  },
});

describe("POST /api/chat handler", () => {
  it("returns the reply and the real tool trace", async () => {
    const response = await chatHandler({ service: service(), getProvider: () => providerReturning("Done") }, post({ message: "list" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      reply: "Done",
      toolCalls: [{ name: "list_tasks", args: {}, result: { ok: true, tasks: [] } }],
    });
  });

  it("passes validated history to the provider", async () => {
    let received: unknown;
    const provider: LlmProvider = {
      run: async (_request, _instructions, _tools, history) => {
        received = history;
        return { text: "ok", toolCalls: [] };
      },
    };

    await chatHandler(
      { service: service(), getProvider: () => provider },
      post({ message: "next", history: [{ role: "user", text: "earlier" }] }),
    );

    expect(received).toEqual([{ role: "user", text: "earlier" }]);
  });

  it("rejects empty, oversized, and malformed input with 400 before calling the model", async () => {
    let calls = 0;
    const provider: LlmProvider = { run: async () => (calls++, { text: "", toolCalls: [] }) };
    const deps = { service: service(), getProvider: () => provider };

    expect((await chatHandler(deps, post({ message: "   " }))).status).toBe(400);
    expect((await chatHandler(deps, post({ message: "x".repeat(2001) }))).status).toBe(400);
    expect((await chatHandler(deps, post({ message: "a", history: [{ role: "system", text: "t" }] }))).status).toBe(400);
    expect((await chatHandler(deps, new Request("http://x", { method: "POST", body: "nope" }))).status).toBe(400);
    expect(calls).toBe(0);
  });

  it.each([
    [new AgentLimitError(), 422],
    [new ModelServiceError(429), 429],
    [new ModelServiceError(504), 504],
    [new ModelServiceError(500), 502],
    [new Error("boom with SECRET"), 502],
  ])("maps %s to HTTP %i without leaking internals", async (error, status) => {
    const response = await chatHandler({ service: service(), getProvider: () => providerThrowing(error) }, post({ message: "x" }));
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body.ok).toBe(false);
    expect(JSON.stringify(body)).not.toContain("SECRET");
  });

  it("maps a missing key raised while creating the provider", async () => {
    const getProvider = () => {
      throw new ConfigurationError("GEMINI_API_KEY is not configured.");
    };

    expect((await chatHandler({ service: service(), getProvider }, post({ message: "x" }))).status).toBe(503);
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    let time = 0;
    const allow = createRateLimiter(2, 1000, () => time);
    const deps = { service: service(), getProvider: () => providerReturning(), allow };

    expect((await chatHandler(deps, post({ message: "1" }))).status).toBe(200);
    expect((await chatHandler(deps, post({ message: "2" }))).status).toBe(200);
    expect((await chatHandler(deps, post({ message: "3" }))).status).toBe(429);
    time = 1500;
    expect((await chatHandler(deps, post({ message: "4" }))).status).toBe(200);
  });
});
