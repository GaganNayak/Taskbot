"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { StatusDialog } from "@/components/StatusDialog";
import { TopBar } from "@/components/TopBar";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useHealth } from "@/hooks/use-health";
import { useCompleteTask } from "@/hooks/use-complete-task";
import { useTasks } from "@/hooks/use-tasks";
import type { ToolCallTrace } from "@/llm/types";

const HIGHLIGHT_MS = 3000;

// Task IDs the assistant created or completed, from the real tool results.
const changedTaskIds = (toolCalls: ToolCallTrace[]): string[] =>
  toolCalls.flatMap(({ name, result }) => {
    const id = (result as { ok?: boolean; task?: { id?: string } } | null)?.task?.id;
    return (name === "create_task" || name === "complete_task") && id ? [id] : [];
  });

export default function Page() {
  const { tasks, loading, error, refresh } = useTasks();
  const health = useHealth();
  const [statusOpen, setStatusOpen] = useState(false);
  const { complete, busyId } = useCompleteTask(refresh);
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onToolCalls = useCallback(
    (toolCalls: ToolCallTrace[]) => {
      if (toolCalls.length === 0) {
        return;
      }

      void refresh();
      setHighlightIds(changedTaskIds(toolCalls));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setHighlightIds([]), HIGHLIGHT_MS);
    },
    [refresh],
  );

  return (
    <div className="flex h-dvh flex-col">
      <TopBar onOpenStatus={() => setStatusOpen(true)} />
      <StatusDialog health={health} open={statusOpen} onOpenChange={setStatusOpen} />
      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-3 p-4 md:p-6">
        {health && !health.keyConfigured && (
          <Alert variant="destructive">
            <AlertDescription>
              GEMINI_API_KEY is not configured, so the assistant is unavailable. The task board still works. Add the key
              to .env and restart the server.
            </AlertDescription>
          </Alert>
        )}

        {/* Tasks first, chat second: left/right on desktop, top/bottom on mobile. */}
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-4 md:grid-cols-2 md:grid-rows-1">
          <TaskBoard
            tasks={tasks}
            loading={loading}
            error={error}
            onChanged={refresh}
            onComplete={complete}
            busyId={busyId}
            highlightIds={highlightIds}
          />
          <ChatPanel onToolCalls={onToolCalls} liveTasks={tasks} busyId={busyId} onComplete={complete} />
        </div>
      </main>
    </div>
  );
}
