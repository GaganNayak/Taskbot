import { createTaskHandler, listTasksHandler } from "@/lib/handlers";
import { getTaskService } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) => listTasksHandler(getTaskService(), request);
export const POST = (request: Request) => createTaskHandler(getTaskService(), request);
