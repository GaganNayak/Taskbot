import { randomUUID } from "node:crypto";

import { TaskNotFoundError } from "../errors";
import {
  completeTaskInputSchema,
  createTaskInputSchema,
  listTasksInputSchema,
} from "../schemas/task-schemas";
import { BUSINESS_TIME_ZONE, currentBusinessDate, isOverdue } from "../lib/business-date";
import type { TaskRepository } from "../repositories/task-repository";
import type { CompleteTaskInput, CreateTaskInput, ListTasksInput, Task } from "../types/task";

export { BUSINESS_TIME_ZONE, currentBusinessDate, isOverdue };

export type CompletionResult = {
  task: Task;
  alreadyCompleted: boolean;
};

export class TaskService {
  // Serializes read-modify-write cycles; the JSON repository is not concurrency-safe.
  private lock: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly repository: TaskRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = () => `task_${randomUUID()}`,
  ) {}

  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.lock.then(operation, operation);
    this.lock = result.catch(() => undefined);
    return result;
  }

  createTask(input: CreateTaskInput): Promise<Task> {
    return this.serialize(() => this.createTaskUnlocked(input));
  }

  completeTask(input: CompleteTaskInput): Promise<CompletionResult> {
    return this.serialize(() => this.completeTaskUnlocked(input));
  }

  private async createTaskUnlocked(input: CreateTaskInput): Promise<Task> {
    const values = createTaskInputSchema.parse(input);
    const tasks = await this.repository.loadTasks();
    const task: Task = {
      id: this.createUniqueId(tasks),
      title: values.title,
      ...(values.description ? { description: values.description } : {}),
      priority: values.priority ?? "medium",
      ...(values.dueDate ? { dueDate: values.dueDate } : {}),
      status: "open",
      createdAt: this.now().toISOString(),
    };

    await this.repository.saveTasks([...tasks, task]);
    return task;
  }

  async listTasks(input: ListTasksInput = {}): Promise<Task[]> {
    const filters = listTasksInputSchema.parse(input);
    const tasks = await this.repository.loadTasks();
    const today = currentBusinessDate(this.now());

    return tasks.filter(
      (task) =>
        (!filters.status || task.status === filters.status) &&
        (!filters.overdue || isOverdue(task, today)),
    );
  }

  private async completeTaskUnlocked(input: CompleteTaskInput): Promise<CompletionResult> {
    const { taskId } = completeTaskInputSchema.parse(input);
    const tasks = await this.repository.loadTasks();
    const existing = tasks.find((task) => task.id === taskId);

    if (!existing) {
      throw new TaskNotFoundError(taskId);
    }

    if (existing.status === "completed") {
      return { task: existing, alreadyCompleted: true };
    }

    const task: Task = { ...existing, status: "completed", completedAt: this.now().toISOString() };

    await this.repository.saveTasks(tasks.map((entry) => (entry.id === taskId ? task : entry)));
    return { task, alreadyCompleted: false };
  }

  private createUniqueId(tasks: Task[]): string {
    for (let attempts = 0; attempts < 10; attempts += 1) {
      const id = this.createId();

      if (!tasks.some((task) => task.id === id)) {
        return id;
      }
    }

    throw new Error("Unable to generate a unique task ID.");
  }
}
