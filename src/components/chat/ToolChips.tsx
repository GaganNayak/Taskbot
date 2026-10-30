import { Badge } from "@/components/ui/badge";
import type { ToolCallTrace } from "@/llm/types";
import { describeToolCall } from "@/lib/tool-labels";

export const ToolChips = ({ toolCalls }: { toolCalls: ToolCallTrace[] }) =>
  toolCalls.length === 0 ? null : (
    <ul aria-label="Actions taken" className="mt-2 flex flex-wrap gap-1.5">
      {toolCalls.map((call, index) => {
        const { label, ok } = describeToolCall(call);

        return (
          <li key={index}>
            <Badge variant={ok ? "secondary" : "destructive"} className="h-auto whitespace-normal py-0.5">
              {label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
