import type { Task } from "../types/task";
import type { ToolCallTrace } from "../llm/types";

type Result = { ok?: boolean; error?: string; task?: { title: string }; tasks?: unknown[]; alreadyCompleted?: boolean };

// Labels come from the real tool results, not from the model's wording.
export const describeToolCall = ({ name, result }: ToolCallTrace): { label: string; ok: boolean } => {
  const r = (result ?? {}) as Result;

  if (!r.ok) {
    return { label: `${name} failed: ${r.error ?? "unknown error"}`, ok: false };
  }

  if (name === "create_task") return { label: `Created “${r.task?.title}”`, ok: true };
  if (name === "complete_task") {
    return { label: `${r.alreadyCompleted ? "Already completed" : "Completed"} “${r.task?.title}”`, ok: true };
  }
  if (name === "list_tasks") {
    const count = r.tasks?.length ?? 0;
    return { label: `Listed ${count} task${count === 1 ? "" : "s"}`, ok: true };
  }

  return { label: name, ok: true };
};

// Tasks from the last successful list_tasks call in a reply, if any.
export const listedTasks = (toolCalls: ToolCallTrace[] = []): Task[] => {
  const last = toolCalls.filter(({ name, result }) => name === "list_tasks" && (result as Result | null)?.ok).at(-1);

  return ((last?.result as { tasks?: Task[] } | undefined)?.tasks ?? []) as Task[];
};
