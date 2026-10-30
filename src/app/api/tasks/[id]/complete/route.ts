import { completeTaskHandler } from "@/lib/handlers";
import { getTaskService } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (_request: Request, { params }: { params: Promise<{ id: string }> }) =>
  completeTaskHandler(getTaskService(), (await params).id);
