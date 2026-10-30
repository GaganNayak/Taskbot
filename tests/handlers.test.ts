import { describe, expect, it } from "vitest";

import { completeTaskHandler, createTaskHandler, listTasksHandler } from "../src/lib/handlers";
import { TaskService } from "../src/services/task-service";
import { fixedNow, makeTask, MemoryTaskRepository } from "./helpers";

const post = (body: unknown) =>
  new Request("http://x/api/tasks", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

describe("task API handlers", () => {
  it("creates (201), lists with filters, and completes a task", async () => {
    const service = new TaskService(new MemoryTaskRepository(), fixedNow, () => "t1");

    const created = await createTaskHandler(service, post({ title: "A", dueDate: "2026-10-01" }));
    expect(created.status).toBe(201);

    const overdue = await listTasksHandler(service, new Request("http://x/api/tasks?overdue=true"));
    expect((await overdue.json()).tasks).toHaveLength(1);

    const done = await completeTaskHandler(service, "t1");
    expect(await done.json()).toMatchObject({ ok: true, alreadyCompleted: false, task: { status: "completed" } });

    const open = await listTasksHandler(service, new Request("http://x/api/tasks?status=open"));
    expect((await open.json()).tasks).toEqual([]);
  });

  it("returns 400 with the validation message and saves nothing", async () => {
    const repository = new MemoryTaskRepository();
    const service = new TaskService(repository, fixedNow);

    const blank = await createTaskHandler(service, post({ title: " " }));
    expect(blank.status).toBe(400);
    expect(await blank.json()).toEqual({ ok: false, error: "Task title cannot be blank." });

    expect((await createTaskHandler(service, post("not json"))).status).toBe(400);
    expect(
      (await listTasksHandler(service, new Request("http://x/api/tasks?status=bogus"))).status,
    ).toBe(400);
    expect(repository.tasks).toEqual([]);
  });

  it("returns 404 for an unknown task and 500 for storage failure", async () => {
    const service = new TaskService(new MemoryTaskRepository([makeTask()]), fixedNow);
    expect((await completeTaskHandler(service, "nope")).status).toBe(404);

    class Broken extends MemoryTaskRepository {
      override async loadTasks(): Promise<never> {
        throw new (await import("../src/errors.js")).StorageError("Unable to read the task storage file.");
      }
    }
    const response = await listTasksHandler(new TaskService(new Broken()), new Request("http://x/api/tasks"));
    expect(response.status).toBe(500);
  });

  it("does not lose writes when two creates run concurrently", async () => {
    const repository = new MemoryTaskRepository();
    let n = 0;
    const service = new TaskService(repository, fixedNow, () => `t${(n += 1)}`);

    await Promise.all([service.createTask({ title: "A" }), service.createTask({ title: "B" })]);

    expect(repository.tasks.map((task) => task.title).sort()).toEqual(["A", "B"]);
  });
});
