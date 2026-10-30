# Task Management AI Agent --- Architecture

## 1. Purpose

This document describes the architecture for a small, hands-on AI agent
that manages personal tasks through natural-language requests. The first
version is a command-line application built with TypeScript, Node.js,
the Google Gen AI SDK (Gemini), Zod, and local JSON-file storage.

The design deliberately starts as a **single-agent, single-process
application**. It avoids a frontend, database server, vector database,
and multi-agent orchestration until they are needed.

## 2. Goals and non-goals

### Goals

-   Accept natural-language requests to create, list, and complete
    tasks.
-   Let the LLM select from a small set of explicitly defined tools.
-   Validate tool inputs before changing application state.
-   Persist tasks between application runs.
-   Keep business logic separate from LLM instructions.
-   Make failures understandable and testable.

### Initial non-goals

-   Multi-user access or authentication.
-   Autonomous scheduling or background execution.
-   Email, calendar, or external task-system integrations.
-   Vector search or retrieval-augmented generation (RAG).
-   A web UI or production-grade distributed deployment.

## 3. System context

``` mermaid
flowchart TB
    U[User] -->|Natural-language request| CLI[Command-line interface]
    CLI --> APP[Task Agent application]
    APP --> SDK[Gemini function calling]
    SDK <-->|Model requests and responses| LLM[Gemini model]
    SDK -->|Tool call with arguments| REG[Registered task tools]
    REG --> VAL[Input validation with Zod]
    VAL --> SVC[Task service / business rules]
    SVC --> STORE[(tasks.json)]
    STORE --> SVC
    SVC -->|Tool result| SDK
    SDK -->|Final response| APP
    APP --> CLI
    CLI -->|Readable answer| U
```

The model does not directly access the JSON file. It requests a
registered tool; application code validates the arguments and performs
the operation. The tool result is returned to the agent, which can then
provide a user-facing answer.

## 4. Component architecture

``` mermaid
flowchart LR
    subgraph Presentation["Presentation layer"]
        CLI["CLI / terminal"]
    end

    subgraph AgentLayer["Agent layer"]
        RUN["Agent runner"]
        PROMPT["Agent instructions"]
        SDK["LLM provider (Gemini)"]
        TOOLS["Tool definitions"]
    end

    subgraph Application["Application layer"]
        SCHEMA["Zod schemas"]
        SERVICE["Task service"]
        ERRORS["Error handling"]
    end

    subgraph Persistence["Persistence layer"]
        REPO["Task repository"]
        JSON[("tasks.json")]
    end

    CLI --> RUN
    RUN --> SDK
    PROMPT --> SDK
    SDK <--> MODEL["Gemini model"]
    SDK --> TOOLS
    TOOLS --> SCHEMA
    SCHEMA --> SERVICE
    SERVICE --> ERRORS
    SERVICE --> REPO
    REPO <--> JSON
    ERRORS --> TOOLS
    TOOLS --> SDK
    SDK --> RUN
    RUN --> CLI
```

### Component responsibilities

  -----------------------------------------------------------------------
  Component                           Responsibility
  ----------------------------------- -----------------------------------
  CLI                                 Reads user input and prints the
                                      agent response.

  Agent runner                        Starts a run, handles errors, and
                                      returns the final output.

  Agent instructions                  Explain the agent's purpose,
                                      available actions, and constraints.

  LLM provider                        Manages model interaction and the
                                      tool-calling loop.

  Tool definitions                    Expose a small, explicit set of
                                      functions to the model.

  Zod schemas                         Validate and constrain tool
                                      arguments at runtime.

  Task service                        Enforces task rules and implements
                                      create/list/complete behavior.

  Task repository                     Reads and writes task records.

  `tasks.json`                        Simple local persistence for the
                                      learning version.

  Gemini model                        Interprets requests, selects tools,
                                      and formulates responses.
  -----------------------------------------------------------------------

## 5. Tool design

The initial agent should expose only these tools:

  -----------------------------------------------------------------------
  Tool                    Input                   Behavior
  ----------------------- ----------------------- -----------------------
  `create_task`           Title, optional         Validates and saves a
                          description, priority,  new task.
                          optional due date       

  `list_tasks`            Optional status and     Returns matching tasks.
                          overdue filters         

  `complete_task`         Task ID                 Marks a matching task
                                                  complete.
  -----------------------------------------------------------------------

Keep tool contracts narrow and deterministic. The model should not write
files, execute shell commands, or issue arbitrary SQL. The
application---not the model---owns IDs, timestamps, persistence, and
business rules.

### Task record

``` typescript
type Task = {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  dueDate?: string; // ISO 8601 date, YYYY-MM-DD
  status: "open" | "completed";
  createdAt: string; // ISO 8601 timestamp
  completedAt?: string;
};
```

Validate date formats and task IDs in application code. Define the
meaning of "overdue" consistently: a task is overdue when it is not
completed and its due date is earlier than the current local business
date. For an initial personal tool, document which timezone is used.

## 6. Request and tool-call sequence

``` mermaid
sequenceDiagram
    actor User
    participant CLI as CLI
    participant Agent as Agent runner / SDK
    participant Model as Gemini model
    participant Tool as Task tool
    participant Service as Task service
    participant Repo as JSON repository

    User->>CLI: "Add a high-priority task for tomorrow"
    CLI->>Agent: Submit request
    Agent->>Model: Instructions + user request + tool schemas
    Model-->>Agent: Tool call: create_task(arguments)
    Agent->>Tool: Execute validated tool call
    Tool->>Service: Create task input
    Service->>Service: Validate business rules
    Service->>Repo: Save task
    Repo-->>Service: Persisted task
    Service-->>Tool: Created task result
    Tool-->>Agent: Tool output
    Agent->>Model: Tool result
    Model-->>Agent: Final response
    Agent-->>CLI: Final output
    CLI-->>User: Confirmation
```

The model may call a tool more than once if a request requires multiple
steps. Configure an execution-step limit and handle model/API errors,
tool errors, and timeouts. Never report a mutation as successful unless
the tool confirms it.

## 7. Data flow and trust boundaries

1.  The user enters a request through the CLI.
2.  The agent runner sends the request and tool definitions to the model
    through the SDK.
3.  The model can request one of the registered tools.
4.  The tool schema validates the arguments.
5.  The task service applies business rules.
6.  The repository persists the change or retrieves records.
7.  The tool returns a bounded result to the SDK.
8.  The model produces a response based on the tool result.
9.  The CLI displays the response.

**Trust boundary:** model-generated arguments are untrusted input.
Validate them even when a schema is supplied to the model. Tool results
and user text should not be treated as instructions that can override
the application's rules.

## 8. Security and reliability

For the learning prototype:

-   Keep `GEMINI_API_KEY` in `.env`; add `.env` to `.gitignore` and
    never commit secrets.
-   Limit tools to the three task operations. Do not expose arbitrary
    filesystem, shell, or database access.
-   Validate titles, IDs, dates, priorities, and filter values.
-   Handle missing task IDs and malformed storage files explicitly.
-   Use a maximum agent-turn/tool-call limit to prevent runaway loops.
-   Avoid logging API keys or unnecessarily logging sensitive user
    content.
-   Use deterministic unit tests for the task service and repository.
-   Treat the JSON file as single-process storage. Concurrent writes can
    overwrite data; use a database or a serialized write strategy before
    adding concurrency.
-   Keep tool operations idempotent where practical. Completing an
    already-completed task should return a clear result rather than
    corrupting state.

For a future web or multi-user version, add authentication,
authorization, per-user task ownership, rate limits, request tracing,
and database transactions. Require explicit user confirmation before
adding destructive or external side-effecting tools.

## 9. Suggested project structure

``` text
task-agent/
├── src/
│   ├── index.ts             # Application entry point / CLI
│   ├── agent.ts             # Agent instructions and SDK setup
│   ├── tools/
│   │   └── task-tools.ts    # create_task, list_tasks, complete_task
│   ├── services/
│   │   └── task-service.ts  # Business rules
│   ├── repositories/
│   │   └── task-repository.ts
│   ├── schemas/
│   │   └── task-schemas.ts  # Zod schemas
│   └── types/
│       └── task.ts
├── tests/
│   ├── task-service.test.ts
│   └── task-repository.test.ts
├── tasks.json               # Local data; do not commit
├── .env                     # API key; do not commit
├── .env.example             # Placeholder variable names only
├── .gitignore
├── package.json
├── tsconfig.json
└── ARCHITECTURE.md
```

This is a suggested structure, not a requirement to create every file on
day one. Start with the smallest working implementation and split
modules as responsibilities become clearer.

## 10. Implementation milestones

1.  **LLM connection:** Make a single model request and print the
    response.
2.  **One tool:** Implement `create_task` with Zod validation and
    in-memory storage.
3.  **Agent loop:** Confirm that the model can call the tool and use its
    result.
4.  **Remaining tools:** Add `list_tasks` and `complete_task`.
5.  **Persistence:** Move task storage to `tasks.json`.
6.  **Reliability:** Add error handling, execution limits, and unit
    tests.
7.  **Optional UI:** Add a Next.js frontend only after the CLI workflow
    works.

## 11. Future evolution

When the prototype's limitations become real problems, evolve the
architecture deliberately:

-   Replace JSON storage with SQLite for a simple local app, or
    PostgreSQL for a server-backed application.
-   Add a REST API when a web frontend or other clients need access.
-   Add authentication and per-user authorization before supporting
    multiple users.
-   Add a background job queue for long-running or scheduled workflows.
-   Add retrieval (RAG) only if the agent needs to search unstructured
    documents.
-   Introduce multiple agents only when separate responsibilities and
    handoffs provide measurable value.

## 12. Definition of done

The first version is complete when:

-   A natural-language request can create a task.
-   The agent can list open and completed tasks.
-   A task can be completed by ID.
-   Tasks survive application restarts.
-   Invalid inputs and unknown IDs produce clear errors.
-   Tests cover task creation, filtering, completion, persistence, and
    error paths.
-   Secrets and local task data are excluded from version control.

## 13. Web UI (implemented in Version 1)

A Next.js (App Router) + shadcn/ui interface was added in the same repository. It reuses the domain code unchanged in behavior and adds a thin HTTP layer. Full design and decisions are in `FRONTEND_PLAN.md`.

``` mermaid
flowchart TB
    subgraph Browser
        Board["Task board (tabs, rows, detail, new task)"]
        Chat["Chat panel (messages, task cards, tool chips)"]
    end
    subgraph Routes["Next.js route handlers (Node runtime)"]
        T["/api/tasks, /api/tasks/[id]/complete"]
        C["/api/chat (validation, rate limit, error mapping)"]
        H["/api/health"]
    end
    Board --> T
    Chat --> C
    T --> SVC[TaskService]
    C --> AGENT[runTaskAgent] --> PROV["LlmProvider (Gemini)"]
    AGENT --> SVC
    SVC --> REPO[JsonTaskRepository] --> FILE[("tasks.json")]
```

Differences from the original CLI-only design:

- **Provider abstraction:** the model backend is an `LlmProvider` (`src/llm/types.ts`). Gemini (`@google/genai`) is implemented with an application-owned tool loop (6-turn cap, 30 s request timeout, one retry on 429/5xx). Adding OpenAI means one new provider file.
- **Tool trace:** `run` returns `{ text, toolCalls }`. The UI renders chips and task cards from the real tool results, not from the model's wording.
- **Chat history:** held in the browser; the last 10 messages are sent per request. Earlier tool results are given to the model as reference data in the system instruction (not inside its own turns), which also lets it resolve "complete the first one".
- **Scope guardrails:** instructions restrict the assistant to task management; a code-level check replaces code-block replies produced without a tool call.
- **Concurrency:** `TaskService` serializes read-modify-write operations because the browser can issue overlapping requests. Still single-process only.
- **Direct paths:** the board's Complete button and the New task form call the REST routes and the service directly, without the model.
- **Layout (as built):** `src/app` (pages and routes), `src/components` (`chat/`, `tasks/`, `ui/`), `src/hooks`, `src/lib` (handlers, API client, business-date helpers, rate limiter), plus the original `src/agent.ts`, `src/llm`, `src/services`, `src/repositories`, `src/schemas`, `src/tools`, and the CLI in `src/index.ts`.
