import { chatHandler } from "@/lib/handlers";
import { allowChat, getProvider, getTaskService } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const POST = (request: Request) =>
  chatHandler({ service: getTaskService(), getProvider, allow: allowChat }, request);
