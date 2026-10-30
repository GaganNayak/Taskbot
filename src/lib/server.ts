import { join } from "node:path";

import { createProvider } from "../llm/index";
import type { LlmProvider } from "../llm/types";
import { JsonTaskRepository } from "../repositories/task-repository";
import { TaskService } from "../services/task-service";
import { createRateLimiter } from "./rate-limit";

// One instance per process (kept across dev hot reloads) matches the
// single-process JSON storage limit.
const globalState = globalThis as unknown as {
  taskService?: TaskService;
  provider?: LlmProvider;
  chatLimiter?: () => boolean;
};

export const getTaskService = (): TaskService =>
  (globalState.taskService ??= new TaskService(new JsonTaskRepository(join(process.cwd(), "tasks.json"))));

// Throws ConfigurationError when the API key is missing.
export const getProvider = (): LlmProvider => (globalState.provider ??= createProvider());

export const allowChat = (): boolean => (globalState.chatLimiter ??= createRateLimiter(10, 60_000))();
