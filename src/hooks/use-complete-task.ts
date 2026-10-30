"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { completeTask } from "@/lib/api-client";
import type { Task } from "@/types/task";

// Shared by the board and the chat cards so both behave and report the same way.
export const useCompleteTask = (onChanged: () => void) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const complete = useCallback(
    async (task: Task) => {
      setBusyId(task.id);

      try {
        await completeTask(task.id);
        toast.success(`Completed "${task.title}"`);
        onChanged();
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : "Could not complete the task.");
      } finally {
        setBusyId(null);
      }
    },
    [onChanged],
  );

  return { complete, busyId };
};
