import { RotateCw } from "lucide-react";

import { TaskCards } from "@/components/chat/TaskCards";
import { ToolChips } from "@/components/chat/ToolChips";
import { Button } from "@/components/ui/button";
import type { UiMessage } from "@/hooks/use-chat";
import { listedTasks } from "@/lib/tool-labels";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

// Renders **bold** only; anything else stays plain text (no raw HTML).
const withBold = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) => (index % 2 === 1 ? <strong key={index}>{part}</strong> : part));

export const Message = ({
  message,
  onRetry,
  canRetry,
  liveTasks,
  busyId,
  onComplete,
}: {
  message: UiMessage;
  onRetry: () => void;
  canRetry: boolean;
  liveTasks: Task[];
  busyId: string | null;
  onComplete: (task: Task) => void;
}) => {
  if (message.role === "error") {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <span className="flex-1">{message.text}</span>
        {canRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RotateCw /> Retry
          </Button>
        )}
      </div>
    );
  }

  const mine = message.role === "user";
  const listed = mine ? [] : listedTasks(message.toolCalls);

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("min-w-0 max-w-[90%] rounded-lg px-3 py-2 text-sm", mine ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <p className="whitespace-pre-wrap break-words">{mine ? message.text : withBold(message.text)}</p>
        {listed.length > 0 && <TaskCards tasks={listed} liveTasks={liveTasks} busyId={busyId} onComplete={onComplete} />}
        {message.toolCalls && <ToolChips toolCalls={message.toolCalls} />}
      </div>
    </div>
  );
};
