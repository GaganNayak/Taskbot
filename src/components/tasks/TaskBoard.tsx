"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { NewTaskDialog } from "@/components/tasks/NewTaskDialog";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { currentBusinessDate, isOverdue } from "@/lib/business-date";
import type { Task } from "@/types/task";

const FILTERS = {
  all: () => true,
  open: (task: Task) => task.status === "open",
  overdue: (task: Task, today: string) => isOverdue(task, today),
  completed: (task: Task) => task.status === "completed",
};
type Filter = keyof typeof FILTERS;

const EMPTY: Record<Filter, string> = {
  all: "No tasks yet. Create one, or ask the assistant.",
  open: "Nothing open. Nice work.",
  overdue: "No overdue tasks.",
  completed: "No completed tasks yet.",
};

export const TaskBoard = ({
  tasks,
  loading,
  error,
  onChanged,
  onComplete,
  busyId,
  highlightIds = [],
}: {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  onChanged: () => void;
  onComplete: (task: Task) => void;
  busyId: string | null;
  highlightIds?: string[];
}) => {
  const [filter, setFilter] = useState<Filter>("open");
  const [selected, setSelected] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const today = currentBusinessDate(new Date());
  const visible = tasks.filter((task) => FILTERS[filter](task, today));

  return (
    <section aria-label="Tasks" className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            {(Object.keys(FILTERS) as Filter[]).map((key) => (
              <TabsTrigger key={key} value={key} className="capitalize">
                {key} ({tasks.filter((task) => FILTERS[key](task, today)).length})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus /> New task
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} className="h-14 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{EMPTY[filter]}</p>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {visible.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              overdue={isOverdue(task, today)}
              busy={busyId === task.id}
              highlighted={highlightIds.includes(task.id)}
              onOpen={() => setSelected(task)}
              onComplete={() => onComplete(task)}
            />
          ))}
        </ul>
      )}

      <TaskSheet task={selected} onClose={() => setSelected(null)} />
      <NewTaskDialog open={creating} onOpenChange={setCreating} onCreated={onChanged} />
    </section>
  );
};
