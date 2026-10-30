import type { ZodType } from "zod";

import { StorageError, TaskNotFoundError } from "../errors";
import type { ToolDef } from "../llm/types";
import {
  completeTaskInputSchema,
  createTaskInputSchema,
  listTasksInputSchema,
} from "../schemas/task-schemas";
import type { TaskService } from "../services/task-service";

// Validates model-supplied arguments, then runs the operation. Always returns a
// structured result; failures are never success-shaped.
const defineTool = <T>(
  name: string,
  description: string,
  schema: ZodType<T>,
  run: (input: T) => Promise<Record<string, unknown>>,
): ToolDef => ({
  name,
  description,
  schema,
  async execute(args) {
    const parsed = schema.safeParse(args ?? {});

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((issue) => issue.message).join(" ") };
    }

    try {
      return { ok: true, ...(await run(parsed.data)) };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof TaskNotFoundError || error instanceof StorageError
            ? error.message
            : "The task operation failed unexpectedly.",
      };
    }
  },
});

export const createTaskTools = (service: TaskService): ToolDef[] => [
  defineTool(
    "create_task",
    "Create exactly one task. Use only after the user supplied a non-empty title and any due date is an unambiguous YYYY-MM-DD value.",
    createTaskInputSchema,
    async (input) => ({ task: await service.createTask(input) }),
  ),
  defineTool(
    "list_tasks",
    "List stored tasks, optionally filtered by status and/or only overdue open tasks. Use for every request about existing task data.",
    listTasksInputSchema,
    async (input) => ({ tasks: await service.listTasks(input) }),
  ),
  defineTool(
    "complete_task",
    "Mark one task completed using its exact task ID. The ID must come from the user or from earlier tool results; never guess it.",
    completeTaskInputSchema,
    async (input) => ({ ...(await service.completeTask(input)) }),
  ),
];
