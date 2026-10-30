import type { TaskRepository } from "../src/repositories/task-repository";
import type { Task } from "../src/types/task";

export class MemoryTaskRepository implements TaskRepository {
  constructor(public tasks: Task[] = []) {}

  async loadTasks(): Promise<Task[]> {
    return structuredClone(this.tasks);
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    this.tasks = structuredClone(tasks);
  }
}

// 2026-10-29 in Asia/Kolkata.
export const fixedNow = () => new Date("2026-10-28T18:30:00.000Z");

export const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Review report",
  priority: "medium",
  status: "open",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});
