"use client";

import { useCallback, useRef, useState } from "react";

import { sendChat } from "@/lib/api-client";
import type { ToolCallTrace } from "@/llm/types";

export type UiMessage = {
  id: number;
  role: "user" | "assistant" | "error";
  text: string;
  toolCalls?: ToolCallTrace[];
};

const HISTORY_LIMIT = 10;

// Chat state lives in the browser only (cleared on refresh); the server is stateless.
export const useChat = (onToolCalls: (toolCalls: ToolCallTrace[]) => void) => {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [sending, setSending] = useState(false);
  const nextId = useRef(1);
  const messagesRef = useRef<UiMessage[]>([]);

  const update = (next: UiMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  };

  const send = useCallback(
    async (text: string, base: UiMessage[] = messagesRef.current) => {
      const message = text.trim();

      if (!message) {
        return;
      }

      const history = base
        .filter((entry) => entry.role !== "error")
        .slice(-HISTORY_LIMIT)
        .map(({ role, text: body, toolCalls }) => ({
          role: role as "user" | "assistant",
          text: body,
          ...(toolCalls?.length ? { toolCalls } : {}),
        }));

      update([...base, { id: nextId.current++, role: "user", text: message }]);
      setSending(true);

      try {
        const { reply, toolCalls } = await sendChat(message, history);

        update([...messagesRef.current, { id: nextId.current++, role: "assistant", text: reply, toolCalls }]);
        onToolCalls(toolCalls);
      } catch (caught) {
        update([
          ...messagesRef.current,
          {
            id: nextId.current++,
            role: "error",
            text: caught instanceof Error ? caught.message : "Something went wrong.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [onToolCalls],
  );

  // Drops the failed user message and its error bubble, then sends it again.
  const retry = useCallback(() => {
    const current = messagesRef.current;
    const last = current.at(-1);
    const failed = current.at(-2);

    if (last?.role === "error" && failed?.role === "user") {
      void send(failed.text, current.slice(0, -2));
    }
  }, [send]);

  const clear = useCallback(() => update([]), []);

  return { messages, sending, send, retry, clear };
};
