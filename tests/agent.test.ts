import type { GenerateContentResponse } from "@google/genai";
import { describe, expect, it } from "vitest";

import { OUT_OF_SCOPE_REPLY, runTaskAgent } from "../src/agent";
import { AgentLimitError, GeminiProvider, type GeminiClient } from "../src/llm/gemini";
import { TaskService } from "../src/services/task-service";
import { createTaskTools } from "../src/tools/task-tools";
import { fixedNow, MemoryTaskRepository } from "./helpers";

const callResponse = (name: string, args: unknown) =>
  ({
    functionCalls: [{ name, args }],
    candidates: [{ content: { role: "model", parts: [{ functionCall: { name, args } }] } }],
  }) as unknown as GenerateContentResponse;

const textResponse = (text: string) => ({ text, functionCalls: undefined }) as unknown as GenerateContentResponse;

const scripted = (responses: Array<GenerateContentResponse | Error>) => {
  const requests: unknown[] = [];
  const configs: Array<{ systemInstruction?: string }> = [];
  const client: GeminiClient = {
    models: {
      async generateContent(params) {
        requests.push(structuredClone(params.contents));
        configs.push(params.config as { systemInstruction?: string });
        const next = responses.shift() ?? textResponse("done");
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
  return { client, requests, configs };
};

const setup = () => {
  const repository = new MemoryTaskRepository();
  return { repository, service: new TaskService(repository, fixedNow, () => "task-1") };
};

describe("task tools", () => {
  it("returns validation messages and creates nothing on bad input", async () => {
    const { repository, service } = setup();
    const [create] = createTaskTools(service);

    await expect(create.execute({ title: "  " })).resolves.toEqual({
      ok: false,
      error: "Task title cannot be blank.",
    });
    expect(repository.tasks).toEqual([]);
  });

  it("accepts an empty description and returns failures as ok:false", async () => {
    const { service } = setup();
    const [create, , complete] = createTaskTools(service);

    await expect(create.execute({ title: "A", description: "" })).resolves.toMatchObject({ ok: true });
    await expect(complete.execute({ taskId: "missing" })).resolves.toEqual({
      ok: false,
      error: 'No task exists with ID "missing".',
    });
  });
});

describe("GeminiProvider via runTaskAgent", () => {
  it("executes the requested tool and feeds the real result back to the model", async () => {
    const { repository, service } = setup();
    const { client, requests } = scripted([
      callResponse("create_task", { title: "Review report", priority: "high" }),
      textResponse("Created."),
    ]);

    const answer = await runTaskAgent("add a task", service, new GeminiProvider(client));

    expect(answer.text).toBe("Created.");
    expect(answer.toolCalls).toEqual([
      expect.objectContaining({ name: "create_task", result: expect.objectContaining({ ok: true }) }),
    ]);
    expect(repository.tasks).toHaveLength(1);
    expect(JSON.stringify(requests[1])).toContain('"functionResponse"');
    expect(JSON.stringify(requests[1])).toContain('"ok":true');
  });

  it("never executes an unregistered tool", async () => {
    const { repository, service } = setup();
    const { client, requests } = scripted([callResponse("delete_everything", {}), textResponse("Sorry.")]);

    await runTaskAgent("x", service, new GeminiProvider(client));

    expect(repository.tasks).toEqual([]);
    expect(JSON.stringify(requests[1])).toContain("Unknown tool");
  });

  it("stops at the turn limit with a controlled error", async () => {
    const { service } = setup();
    const looping = Array.from({ length: 10 }, () => callResponse("list_tasks", {}));
    const { client, requests } = scripted(looping);

    await expect(runTaskAgent("x", service, new GeminiProvider(client, "m", 3))).rejects.toBeInstanceOf(
      AgentLimitError,
    );
    expect(requests).toHaveLength(3);
  });

  it("retries once on a transient 5xx and then succeeds", async () => {
    const { service } = setup();
    const { client, requests } = scripted([
      Object.assign(new Error("overloaded"), { status: 503 }),
      textResponse("ok"),
    ]);

    await expect(runTaskAgent("x", service, new GeminiProvider(client))).resolves.toMatchObject({ text: "ok" });
    expect(requests).toHaveLength(2);
  });

  it("replays history, including earlier tool results, before the new request", async () => {
    const { service } = setup();
    const { client, requests, configs } = scripted([textResponse("ok")]);

    await runTaskAgent("complete the first one", service, new GeminiProvider(client), [
      { role: "assistant", text: "orphan assistant turn (dropped)" },
      { role: "user", text: "show open" },
      { role: "assistant", text: "Here.", toolCalls: [{ name: "list_tasks", args: {}, result: { ok: true, tasks: [{ id: "task-9" }] } }] },
    ]);

    const sent = requests[0] as Array<{ role: string; parts: Array<{ text: string }> }>;
    expect(sent.map((content) => content.role)).toEqual(["user", "model", "user"]);
    // Tool results reach the model as reference data in the system instruction, never as its own text.
    expect(sent[1].parts[0].text).toBe("Here.");
    expect(configs[0].systemInstruction).toContain("task-9");
    expect(sent[2].parts[0].text).toBe("complete the first one");
  });

  it("wraps API failures without leaking provider details", async () => {
    const { service } = setup();
    const { client } = scripted([new Error("401 key=SECRET")]);

    await expect(runTaskAgent("x", service, new GeminiProvider(client))).rejects.toThrow(
      "The agent request could not be completed",
    );
  });
});

describe("buildInstructions", () => {
  it("only asks for short list replies when the UI shows task cards", async () => {
    const { buildInstructions } = await import("../src/agent");

    expect(buildInstructions("2026-10-29")).not.toContain("cards");
    expect(buildInstructions("2026-10-29", { taskCards: true })).toContain("cards");
  });
});

describe("leaked tool notes", () => {
  const leak = ["", "", '[Tool results from this turn: [{"name":"create_task","result":{"ok":true}}]]'].join("\n");

  it("strips a leaked note from the model reply and from replayed history", async () => {
    const { service } = setup();
    const { client, requests } = scripted([textResponse(`Created.${leak}`)]);

    const result = await runTaskAgent("next", service, new GeminiProvider(client), [
      { role: "user", text: "add" },
      { role: "assistant", text: `OK.${leak}` },
    ]);

    expect(result.text).toBe("Created.");
    expect(JSON.stringify(requests[0])).not.toContain("Tool results from this turn");
  });
});

describe("scope guardrails", () => {
  it("replaces a code-block reply that used no task tool", async () => {
    const { service } = setup();
    const { client } = scripted([textResponse('```python\nprint("Hello World")\n```')]);

    const result = await runTaskAgent("write python hello world", service, new GeminiProvider(client));

    expect(result.text).toBe(OUT_OF_SCOPE_REPLY);
    expect(result.toolCalls).toEqual([]);
  });

  it("keeps ordinary replies and states the scope rule in the instructions", async () => {
    const { service } = setup();
    const { client, configs } = scripted([textResponse("Hello! I can help with your tasks.")]);

    const result = await runTaskAgent("hi", service, new GeminiProvider(client));

    expect(result.text).toBe("Hello! I can help with your tasks.");
    expect(configs[0].systemInstruction).toContain("task-management assistant and nothing else");
  });
});
