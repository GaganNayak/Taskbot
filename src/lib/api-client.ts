import type { ChatMessage, ToolCallTrace } from "../llm/types";
import type { CreateTaskInput, Task } from "../types/task";

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(path, init);
  } catch {
    throw new Error("Could not reach the server.");
  }

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error ?? `Request failed (HTTP ${response.status}).`);
  }

  return body as T;
};

export const fetchTasks = async (): Promise<Task[]> =>
  (await request<{ tasks: Task[] }>("/api/tasks", { cache: "no-store" })).tasks;

export const createTask = async (input: CreateTaskInput): Promise<Task> =>
  (
    await request<{ task: Task }>("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    })
  ).task;

export const completeTask = async (taskId: string): Promise<Task> =>
  (await request<{ task: Task }>(`/api/tasks/${encodeURIComponent(taskId)}/complete`, { method: "POST" })).task;

export type ChatReply = { reply: string; toolCalls: ToolCallTrace[] };

export const sendChat = async (message: string, history: ChatMessage[]): Promise<ChatReply> =>
  request<ChatReply>("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
