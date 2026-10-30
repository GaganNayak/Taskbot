import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { StorageError } from "../src/errors";
import { JsonTaskRepository } from "../src/repositories/task-repository";
import { makeTask } from "./helpers";

const directories: string[] = [];

const setup = async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-agent-"));
  directories.push(directory);
  const filePath = join(directory, "tasks.json");

  return { directory, filePath, repository: new JsonTaskRepository(filePath) };
};

afterEach(async () => {
  await Promise.all(directories.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe("JsonTaskRepository", () => {
  it("treats a missing file as empty without creating it", async () => {
    const { directory, repository } = await setup();

    await expect(repository.loadTasks()).resolves.toEqual([]);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("persists across a fresh repository instance (restart) and leaves no temp files", async () => {
    const { directory, filePath, repository } = await setup();
    await repository.saveTasks([makeTask()]);

    await expect(new JsonTaskRepository(filePath).loadTasks()).resolves.toEqual([makeTask()]);
    await expect(readdir(directory)).resolves.toEqual(["tasks.json"]);
  });

  it("preserves malformed JSON and reports a controlled error", async () => {
    const { filePath, repository } = await setup();
    await writeFile(filePath, "{ not json", "utf8");

    await expect(repository.loadTasks()).rejects.toBeInstanceOf(StorageError);
    await expect(readFile(filePath, "utf8")).resolves.toBe("{ not json");
  });

  it("rejects records that violate the schema", async () => {
    const { filePath, repository } = await setup();
    await writeFile(filePath, JSON.stringify([{ ...makeTask(), priority: "urgent" }]), "utf8");

    await expect(repository.loadTasks()).rejects.toThrow("invalid task records");
  });

  it("refuses to save invalid records", async () => {
    const { repository } = await setup();

    await expect(repository.saveTasks([{ ...makeTask(), title: "" }])).rejects.toBeInstanceOf(StorageError);
  });

  it("reports a write failure, keeps existing data, and cleans up the temp file", async () => {
    const { directory, repository } = await setup();
    await repository.saveTasks([makeTask()]);
    // Renaming a file onto a non-empty directory fails.
    await mkdir(join(directory, "blocked", "child"), { recursive: true });

    await expect(new JsonTaskRepository(join(directory, "blocked")).saveTasks([makeTask()])).rejects.toBeInstanceOf(
      StorageError,
    );
    await expect(repository.loadTasks()).resolves.toEqual([makeTask()]);
    expect((await readdir(directory)).filter((name) => name.includes(".tmp-"))).toEqual([]);
  });
});
