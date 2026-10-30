import type { Task } from "../types/task";

// Browser-safe (no Node imports) so the UI and the service share one definition.
export const BUSINESS_TIME_ZONE = "Asia/Kolkata";

// en-CA formats as YYYY-MM-DD.
export const currentBusinessDate = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(date);

export const isOverdue = (task: Task, today: string): boolean =>
  task.status === "open" && task.dueDate !== undefined && task.dueDate < today;
