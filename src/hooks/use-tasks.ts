"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchTasks } from "@/lib/api-client";
import type { Task } from "@/types/task";

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTasks(await fetchTasks());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tasks, loading, error, refresh };
};
