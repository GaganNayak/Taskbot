"use client";

import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currentBusinessDate, isOverdue } from "@/lib/business-date";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

const PRIORITY_VARIANT = { high: "destructive", medium: "secondary", low: "outline" } as const;

// Horizontal, snap-scrolling strip. `tasks` is the snapshot from the tool result;
// each card shows the live version from the board when it is known, so completing
// a task anywhere updates every card.
export const TaskCards = ({
  tasks,
  liveTasks,
  busyId,
  onComplete,
}: {
  tasks: Task[];
  liveTasks: Task[];
  busyId: string | null;
  onComplete: (task: Task) => void;
}) => {
  const today = currentBusinessDate(new Date());
  const live = new Map(liveTasks.map((task) => [task.id, task]));

  return (
    <ul
      aria-label="Tasks listed"
      tabIndex={0}
      className="mt-2 flex snap-x gap-2 overflow-x-auto pb-2 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {tasks.map((snapshot) => {
        const task = live.get(snapshot.id) ?? snapshot;
        const done = task.status === "completed";
        const overdue = isOverdue(task, today);

        return (
          <li key={task.id} className="w-56 shrink-0 snap-start rounded-lg border bg-card p-3 text-card-foreground">
            <div className="flex items-start justify-between gap-2">
              <p className={cn("line-clamp-2 text-sm font-medium", done && "text-muted-foreground line-through")}>
                {task.title}
              </p>
              <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge variant={done ? "secondary" : overdue ? "destructive" : "outline"}>
                {done ? "completed" : overdue ? "overdue" : "open"}
              </Badge>
              {task.dueDate && <span className="text-xs text-muted-foreground">Due {task.dueDate}</span>}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              disabled={done || busyId === task.id}
              onClick={() => onComplete(task)}
              aria-label={done ? `${task.title} is completed` : `Mark "${task.title}" complete`}
            >
              <Check /> {done ? "Completed" : "Complete"}
            </Button>
          </li>
        );
      })}
    </ul>
  );
};
