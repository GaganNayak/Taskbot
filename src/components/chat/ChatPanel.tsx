"use client";

import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Message } from "@/components/chat/Message";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/use-chat";
import type { ToolCallTrace } from "@/llm/types";
import type { Task } from "@/types/task";

const SUGGESTIONS = [
  "Create a high-priority task to review the stock report due tomorrow.",
  "Show all open tasks.",
  "Show overdue tasks.",
];

export const ChatPanel = ({
  onToolCalls,
  liveTasks,
  busyId,
  onComplete,
}: {
  onToolCalls: (toolCalls: ToolCallTrace[]) => void;
  liveTasks: Task[];
  busyId: string | null;
  onComplete: (task: Task) => void;
}) => {
  const { messages, sending, send, retry, clear } = useChat(onToolCalls);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, sending]);

  const submit = () => {
    if (!draft.trim() || sending) {
      return;
    }

    void send(draft);
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <section aria-label="Assistant" className="flex min-h-0 flex-col rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-medium">Assistant</h2>
        <Button variant="ghost" size="sm" onClick={clear} disabled={messages.length === 0 || sending}>
          <Trash2 /> Clear
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground">Ask in plain language. Try:</p>
            {SUGGESTIONS.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start whitespace-normal py-1.5 text-left"
                onClick={() => void send(suggestion)}
                disabled={sending}
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <Message
            key={message.id}
            message={message}
            onRetry={retry}
            canRetry={index === messages.length - 1 && !sending}
            liveTasks={liveTasks}
            busyId={busyId}
            onComplete={onComplete}
          />
        ))}

        {sending && (
          <div role="status" className="space-y-2">
            <span className="sr-only">The assistant is working</span>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          aria-label="Message"
          placeholder="Ask the assistant… (Enter to send, Shift+Enter for a new line)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          maxLength={2000}
          className="max-h-32 min-h-10 resize-none"
          rows={1}
        />
        <Button onClick={submit} disabled={!draft.trim() || sending} aria-label="Send message">
          <Send />
        </Button>
      </div>
    </section>
  );
};
