export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StorageError";
  }
}

export class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`No task exists with ID "${taskId}".`);
    this.name = "TaskNotFoundError";
  }
}

export class ModelServiceError extends Error {
  constructor(
    readonly status: number | undefined,
    options?: { cause?: unknown },
  ) {
    super(
      `The agent request could not be completed${status ? ` (model service HTTP ${status})` : ""}. Please try again.`,
      options,
    );
    this.name = "ModelServiceError";
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
