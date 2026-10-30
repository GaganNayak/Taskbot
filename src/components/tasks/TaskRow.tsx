"use client";

import { CheckCircle2, Circle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

const PRIORITY_VARIANT = { high: "destructive", medium: "secondary", low: "outline" } as const;

export const TaskRow = ({
  task,
  overdue,
  busy,
  highlighted,
  onOpen,
  onComplete,
}: {
  task: Task;
  overdue: boolean;
  busy: boolean;
  highlighted: boolean;
  onOpen: () => void;
  onComplete: () => void;
}) => {
  const done = task.status === "completed";

  return (
    <li className={cn("flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors duration-700", highlighted && "border-primary bg-primary/10")}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={done ? "Completed" : `Mark "${task.title}" complete`}
        disabled={done || busy}
        onClick={onComplete}
      >
        {done ? <CheckCircle2 className="text-green-600" /> : <Circle />}
      </Button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
        <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>{task.title}</p>
        {task.dueDate && (
          <p className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
            {overdue ? "Overdue · " : "Due "}
            {task.dueDate}
          </p>
        )}
      </button>
      <Badge variant={PRIORITY_VARIANT[task.priority]}>{task.priority}</Badge>
    </li>
  );
};
