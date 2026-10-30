"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Task } from "@/types/task";

const Field = ({ label, value }: { label: string; value?: string }) =>
  value ? (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  ) : null;

export const TaskSheet = ({ task, onClose }: { task: Task | null; onClose: () => void }) => (
  <Sheet open={task !== null} onOpenChange={(open) => !open && onClose()}>
    <SheetContent>
      {task && (
        <>
          <SheetHeader>
            <SheetTitle>{task.title}</SheetTitle>
            <SheetDescription className="flex gap-2">
              <Badge variant="secondary">{task.status}</Badge>
              <Badge variant="outline">{task.priority} priority</Badge>
            </SheetDescription>
          </SheetHeader>
          <dl className="space-y-3 px-4">
            <Field label="Description" value={task.description} />
            <Field label="Due date" value={task.dueDate} />
            <Field label="Created" value={new Date(task.createdAt).toLocaleString()} />
            <Field label="Completed" value={task.completedAt && new Date(task.completedAt).toLocaleString()} />
            <div>
              <dt className="text-xs text-muted-foreground">Task ID</dt>
              <dd className="flex items-center gap-2">
                <code className="break-all text-xs">{task.id}</code>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Copy task ID"
                  onClick={() => navigator.clipboard.writeText(task.id).then(() => toast.success("ID copied"))}
                >
                  <Copy />
                </Button>
              </dd>
            </div>
          </dl>
        </>
      )}
    </SheetContent>
  </Sheet>
);
