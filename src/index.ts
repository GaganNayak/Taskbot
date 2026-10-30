import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { join } from "node:path";

import { runTaskAgent } from "./agent";
import { ConfigurationError } from "./errors";
import { createProvider } from "./llm/index";
import { JsonTaskRepository } from "./repositories/task-repository";
import { TaskService } from "./services/task-service";

const main = async (): Promise<void> => {
  let provider;

  try {
    provider = createProvider();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }

    throw error;
  }

  const service = new TaskService(new JsonTaskRepository(join(process.cwd(), "tasks.json")));
  const readline = createInterface({ input, output });
  console.log("Task Management AI Agent. Describe a task request, or type exit to quit.");

  try {
    while (true) {
      let request: string;

      try {
        request = (await readline.question("\n> ")).trim();
      } catch {
        break; // stdin closed (e.g. piped input ended)
      }

      if (["exit", "quit"].includes(request.toLowerCase())) {
        break;
      }

      if (!request) {
        console.log("Please enter a task request.");
        continue;
      }

      try {
        console.log(`\n${(await runTaskAgent(request, service, provider)).text}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : "An unexpected error occurred.");
      }
    }
  } finally {
    readline.close();
  }
};

void main();
