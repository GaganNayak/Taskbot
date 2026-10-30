import { z } from "zod";

import { PRIORITIES, TASK_STATUSES } from "../types/task";

export const isValidIsoDate = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
};

const isoDateSchema = z.string().refine(isValidIsoDate, {
  message: "Due date must be a valid ISO calendar date (YYYY-MM-DD).",
});

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(1, "Task title cannot be blank."),
  description: z.string().trim().optional(),
  priority: z.enum(PRIORITIES).optional(),
  dueDate: isoDateSchema.optional(),
});

export const listTasksInputSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  overdue: z.boolean().optional(),
});

export const completeTaskInputSchema = z.object({
  taskId: z.string().trim().min(1, "Task ID cannot be blank."),
});

export const taskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1),
    description: z.string().min(1).optional(),
    priority: z.enum(PRIORITIES),
    dueDate: isoDateSchema.optional(),
    status: z.enum(TASK_STATUSES),
    createdAt: z.string().datetime(),
    completedAt: z.string().datetime().optional(),
  })
  .superRefine((task, context) => {
    if (task.status === "completed" && !task.completedAt) {
      context.addIssue({
        code: "custom",
        message: "Completed tasks require a completion timestamp.",
        path: ["completedAt"],
      });
    }

    if (task.status === "open" && task.completedAt) {
      context.addIssue({
        code: "custom",
        message: "Open tasks cannot have a completion timestamp.",
        path: ["completedAt"],
      });
    }
  });

export const taskListSchema = z.array(taskSchema);
