export const PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_STATUSES = ["open", "completed"] as const;

export type TaskPriority = (typeof PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type Task = {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
};

export type ListTasksInput = {
  status?: TaskStatus;
  overdue?: boolean;
};

export type CompleteTaskInput = {
  taskId: string;
};
