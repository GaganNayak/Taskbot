import { describe, expect, it } from "vitest";

import { StorageError } from "../src/errors";
import { currentBusinessDate, TaskService } from "../src/services/task-service";
import { fixedNow, makeTask, MemoryTaskRepository } from "./helpers";

describe("TaskService", () => {
  it("creates a trimmed open task with default priority and app-owned metadata", async () => {
    const repository = new MemoryTaskRepository();
    const service = new TaskService(repository, fixedNow, () => "task-generated");

    const created = await service.createTask({ title: "  Review stock report  " });

    expect(created).toEqual({
      id: "task-generated",
      title: "Review stock report",
      priority: "medium",
      status: "open",
      createdAt: "2026-10-28T18:30:00.000Z",
    });
    expect(repository.tasks).toEqual([created]);
  });

  it("drops an empty description", async () => {
    const service = new TaskService(new MemoryTaskRepository(), fixedNow);

    await expect(service.createTask({ title: "A", description: "  " })).resolves.not.toHaveProperty(
      "description",
    );
  });

  it("rejects blank titles, bad priorities and invalid calendar dates without saving", async () => {
    const repository = new MemoryTaskRepository();
    const service = new TaskService(repository, fixedNow);

    await expect(service.createTask({ title: "   " })).rejects.toThrow("Task title cannot be blank");
    await expect(service.createTask({ title: "A", priority: "urgent" as "high" })).rejects.toThrow();
    await expect(service.createTask({ title: "A", dueDate: "2026-02-30" })).rejects.toThrow(
      "valid ISO calendar date",
    );
    expect(repository.tasks).toEqual([]);
  });

  it("lists all tasks, filters by status, and handles empty results", async () => {
    const done = makeTask({ id: "done", status: "completed", completedAt: "2026-10-02T00:00:00.000Z" });
    const service = new TaskService(new MemoryTaskRepository([makeTask(), done]), fixedNow);

    await expect(service.listTasks()).resolves.toHaveLength(2);
    await expect(service.listTasks({ status: "completed" })).resolves.toEqual([done]);
    await expect(new TaskService(new MemoryTaskRepository(), fixedNow).listTasks()).resolves.toEqual([]);
  });

  it("filters overdue at the due-date boundary and excludes completed tasks", async () => {
    const service = new TaskService(
      new MemoryTaskRepository([
        makeTask({ id: "yesterday", dueDate: "2026-10-28" }),
        makeTask({ id: "today", dueDate: "2026-10-29" }),
        makeTask({ id: "none" }),
        makeTask({
          id: "done",
          dueDate: "2026-10-01",
          status: "completed",
          completedAt: "2026-10-02T00:00:00.000Z",
        }),
      ]),
      fixedNow,
    );

    await expect(service.listTasks({ overdue: true })).resolves.toEqual([
      expect.objectContaining({ id: "yesterday" }),
    ]);
    await expect(service.listTasks({ status: "completed", overdue: true })).resolves.toEqual([]);
  });

  it("uses Asia/Kolkata for the business date", () => {
    expect(currentBusinessDate(new Date("2026-10-28T18:29:00.000Z"))).toBe("2026-10-28");
    expect(currentBusinessDate(fixedNow())).toBe("2026-10-29");
  });

  it("completes a task and treats repeated completion as a no-op", async () => {
    const repository = new MemoryTaskRepository([makeTask()]);
    const service = new TaskService(repository, fixedNow);

    const first = await service.completeTask({ taskId: "task-1" });
    const second = await service.completeTask({ taskId: "task-1" });

    expect(first).toMatchObject({
      alreadyCompleted: false,
      task: { status: "completed", completedAt: "2026-10-28T18:30:00.000Z" },
    });
    expect(second).toEqual({ task: first.task, alreadyCompleted: true });
    expect(repository.tasks).toHaveLength(1);
  });

  it("does not modify anything for an unknown ID", async () => {
    const repository = new MemoryTaskRepository([makeTask()]);
    const service = new TaskService(repository, fixedNow);

    await expect(service.completeTask({ taskId: "missing" })).rejects.toThrow('No task exists with ID "missing".');
    expect(repository.tasks).toEqual([makeTask()]);
  });

  it("propagates persistence failure instead of reporting success", async () => {
    class Failing extends MemoryTaskRepository {
      override async saveTasks(): Promise<void> {
        throw new StorageError("Disk is unavailable.");
      }
    }

    await expect(new TaskService(new Failing(), fixedNow).createTask({ title: "A" })).rejects.toThrow(
      "Disk is unavailable",
    );
  });
});
