import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { StorageError } from "../errors";
import { taskListSchema } from "../schemas/task-schemas";
import type { Task } from "../types/task";

export interface TaskRepository {
  loadTasks(): Promise<Task[]>;
  saveTasks(tasks: Task[]): Promise<void>;
}

export class JsonTaskRepository implements TaskRepository {
  constructor(private readonly filePath: string) {}

  async loadTasks(): Promise<Task[]> {
    let contents: string;

    try {
      contents = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (hasCode(error, "ENOENT")) {
        return [];
      }

      throw new StorageError("Unable to read the task storage file.", { cause: error });
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(contents);
    } catch (error) {
      throw new StorageError("The task storage file contains malformed JSON. It was not changed.", {
        cause: error,
      });
    }

    const validation = taskListSchema.safeParse(parsed);

    if (!validation.success) {
      throw new StorageError("The task storage file contains invalid task records. It was not changed.", {
        cause: validation.error,
      });
    }

    return validation.data;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    const validation = taskListSchema.safeParse(tasks);

    if (!validation.success) {
      throw new StorageError("Refusing to save invalid task records.", { cause: validation.error });
    }

    const directory = dirname(this.filePath);
    const temporaryPath = join(directory, `${basename(this.filePath)}.tmp-${randomUUID()}`);

    try {
      await mkdir(directory, { recursive: true });
      await writeFile(temporaryPath, `${JSON.stringify(validation.data, null, 2)}\n`, "utf8");
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw new StorageError("Unable to save tasks. The change was not saved.", { cause: error });
    }
  }
}

const hasCode = (error: unknown, code: string): error is NodeJS.ErrnoException =>
  typeof error === "object" && error !== null && "code" in error && error.code === code;
