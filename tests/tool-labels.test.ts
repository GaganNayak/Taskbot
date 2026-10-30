import { describe, expect, it } from "vitest";

import { describeToolCall, listedTasks } from "../src/lib/tool-labels";

describe("describeToolCall", () => {
  it("labels successes from the tool result", () => {
    expect(describeToolCall({ name: "create_task", args: {}, result: { ok: true, task: { title: "A" } } })).toEqual({
      label: "Created “A”",
      ok: true,
    });
    expect(describeToolCall({ name: "list_tasks", args: {}, result: { ok: true, tasks: [{}, {}] } }).label).toBe("Listed 2 tasks");
    expect(describeToolCall({ name: "list_tasks", args: {}, result: { ok: true, tasks: [{}] } }).label).toBe("Listed 1 task");
    expect(
      describeToolCall({ name: "complete_task", args: {}, result: { ok: true, alreadyCompleted: true, task: { title: "A" } } }).label,
    ).toBe("Already completed “A”");
  });

  it("never shows success for a failed or malformed result", () => {
    expect(describeToolCall({ name: "complete_task", args: {}, result: { ok: false, error: "No task exists." } })).toEqual({
      label: "complete_task failed: No task exists.",
      ok: false,
    });
    expect(describeToolCall({ name: "create_task", args: {}, result: undefined }).ok).toBe(false);
  });
});

describe("listedTasks", () => {
  const task = { id: "t1", title: "A" };

  it("returns tasks from the last successful list_tasks call", () => {
    expect(
      listedTasks([
        { name: "list_tasks", args: {}, result: { ok: true, tasks: [{ id: "old" }] } },
        { name: "list_tasks", args: {}, result: { ok: true, tasks: [task] } },
      ]),
    ).toEqual([task]);
  });

  it("ignores failed calls, other tools, and missing traces", () => {
    expect(listedTasks([{ name: "list_tasks", args: {}, result: { ok: false, error: "x" } }])).toEqual([]);
    expect(listedTasks([{ name: "create_task", args: {}, result: { ok: true, task } }])).toEqual([]);
    expect(listedTasks(undefined)).toEqual([]);
  });
});
