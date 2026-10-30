import { z, ZodError } from "zod";

import { runTaskAgent } from "../agent";
import { ConfigurationError, ModelServiceError, StorageError, TaskNotFoundError } from "../errors";
import { AgentLimitError } from "../llm/gemini";
import type { LlmProvider } from "../llm/types";
import type { TaskService } from "../services/task-service";

const json = (body: unknown, status = 200): Response => Response.json(body, { status });

// Maps domain errors to HTTP responses without leaking internals.
export const toErrorResponse = (error: unknown): Response => {
  if (error instanceof ZodError) {
    return json({ ok: false, error: error.issues.map((issue) => issue.message).join(" ") }, 400);
  }

  if (error instanceof TaskNotFoundError) {
    return json({ ok: false, error: error.message }, 404);
  }

  if (error instanceof StorageError) {
    return json({ ok: false, error: error.message }, 500);
  }

  return json({ ok: false, error: "Unexpected server error." }, 500);
};

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    throw new ZodError([{ code: "custom", message: "Request body must be valid JSON.", path: [] }]);
  }
};

export const listTasksHandler = async (service: TaskService, request: Request): Promise<Response> => {
  try {
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? undefined;
    const overdue = params.get("overdue");
    const tasks = await service.listTasks({
      ...(status ? { status: status as "open" } : {}),
      ...(overdue !== null ? { overdue: overdue === "true" } : {}),
    });

    return json({ ok: true, tasks });
  } catch (error) {
    return toErrorResponse(error);
  }
};

export const createTaskHandler = async (service: TaskService, request: Request): Promise<Response> => {
  try {
    return json({ ok: true, task: await service.createTask((await readJson(request)) as never) }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
};

export const completeTaskHandler = async (service: TaskService, taskId: string): Promise<Response> => {
  try {
    return json({ ok: true, ...(await service.completeTask({ taskId })) });
  } catch (error) {
    return toErrorResponse(error);
  }
};

export type ChatDeps = {
  service: TaskService;
  getProvider: () => LlmProvider;
  allow?: () => boolean;
};

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty.").max(2000, "Message is too long (max 2000 characters)."),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(4000),
        toolCalls: z
          .array(z.object({ name: z.string().max(64), args: z.unknown(), result: z.unknown() }))
          .max(10)
          .optional(),
      }),
    )
    .max(10)
    .default([]),
});

const modelErrorResponse = (error: ModelServiceError): Response => {
  if (error.status === 429) {
    return json({ ok: false, error: "The model quota was exceeded. Wait a bit, or set a different GEMINI_MODEL." }, 429);
  }

  if (error.status === 504 || error.status === 408) {
    return json({ ok: false, error: "The model took too long to respond. Please retry." }, 504);
  }

  return json({ ok: false, error: error.message }, 502);
};

export const chatHandler = async (deps: ChatDeps, request: Request): Promise<Response> => {
  try {
    if (deps.allow && !deps.allow()) {
      return json({ ok: false, error: "Too many requests. Please slow down." }, 429);
    }

    const { message, history } = chatRequestSchema.parse(await readJson(request));
    const result = await runTaskAgent(message, deps.service, deps.getProvider(), history, { taskCards: true });

    return json({ ok: true, reply: result.text, toolCalls: result.toolCalls });
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return json({ ok: false, error: error.message }, 503);
    }

    if (error instanceof AgentLimitError) {
      return json({ ok: false, error: error.message }, 422);
    }

    if (error instanceof ModelServiceError) {
      return modelErrorResponse(error);
    }

    return toErrorResponse(error);
  }
};
