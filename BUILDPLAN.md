# Task Management AI Agent --- Build Plan

## 1. Purpose

This plan breaks implementation of the Task Management AI Agent into
small, verifiable phases. The first release is a command-line TypeScript
application using Node.js, the Google Gen AI SDK (Gemini), Zod, and JSON-file
persistence.

**Delivery principle:** complete and verify one phase before starting
the next. Keep the first version deliberately small; do not add a web
UI, database server, RAG, background jobs, or multiple agents until the
core workflow is reliable.

## 2. Scope and success criteria

### Version 1 features

-   Accept natural-language requests through a CLI.
-   Create tasks with a title, optional description, priority, and
    optional due date.
-   List tasks, including filtering by status and overdue state.
-   Complete a task by ID.
-   Persist tasks across application restarts.
-   Use an LLM to select from explicit, validated tools.
-   Handle invalid input, missing task IDs, model/API failures, and
    storage errors.
-   Include automated tests for core business logic.

### Version 1 exclusions

-   User accounts and multi-user access.
-   Web frontend or mobile app.
-   Email/calendar integrations.
-   Autonomous background execution or scheduled reminders.
-   Arbitrary SQL, shell commands, or unrestricted filesystem tools.
-   Multi-agent workflows and vector search.

### Definition of done

The project is ready for a first learning release when a user can
create, list, and complete tasks through natural language; task data
persists after restart; invalid operations fail safely; automated tests
pass; and no API keys or personal task data are committed to source
control.

## 3. Phase overview

  ------------------------------------------------------------------------
  Phase            Focus                 Estimated effort Exit criterion
  ---------------- ---------------- --------------------- ----------------
  0                Project setup               30--45 min TypeScript
                                                          project runs and
                                                          secrets are
                                                          excluded from
                                                          Git.

  1                Direct LLM call             30--60 min CLI sends a
                                                          prompt and
                                                          prints a model
                                                          response.

  2                First tool                  45--90 min Model
                                                          successfully
                                                          calls
                                                          `create_task`.

  3                Task domain and             1--2 hours Create, list,
                   remaining tools                        and complete
                                                          operations work.

  4                Persistence                 45--90 min Tasks survive
                                                          restarts.

  5                Agent workflow              1--2 hours Common failures
                   and error                              are handled
                   handling                               clearly and
                                                          execution is
                                                          bounded.

  6                Automated                   1--2 hours Core domain and
                   testing                                repository tests
                                                          pass.

  7                Polish and                  45--90 min README,
                   learning review                        examples, and
                                                          known
                                                          limitations are
                                                          documented.
  ------------------------------------------------------------------------

Estimates are indicative and assume the developer is already comfortable
with TypeScript and Node.js. API setup, SDK changes, and debugging can
add time.

------------------------------------------------------------------------

## Phase 0 --- Project setup

### Tasks

-   [x] Create a Git repository named `task-agent`.
-   [x] Initialize npm.
-   [x] Install runtime dependencies: `@google/genai`, `zod`, and
    `dotenv`.
-   [x] Install development dependencies: `typescript`, `tsx`, and
    `@types/node`.
-   [x] Configure `tsconfig.json` for the chosen Node.js module system.
-   [x] Add `.gitignore` entries for `node_modules/`, `.env`, and
    `tasks.json`.
-   [x] Create `.env.example` containing only `GEMINI_API_KEY=`.
-   [x] Add a basic `src/index.ts` entry point.
-   [x] Confirm the project runs through `npx tsx src/index.ts`.

### Deliverables

-   Working TypeScript project.
-   Safe local environment-variable setup.
-   Initial repository structure.

### Acceptance criteria

-   [x] The application starts without a TypeScript/runtime error.
-   [x] `.env` and `tasks.json` are ignored by Git.
-   [x] No API key is present in tracked files.

## Phase 1 --- Connect to the model

### Tasks

-   [x] Read the current Gemini function-calling docs.
-   [x] Load the API key from environment variables.
-   [x] Create a minimal agent with a clear name and instructions.
-   [x] Read one request from the CLI.
-   [x] Call the agent and print its final output.
-   [x] Handle missing API configuration and API errors.
-   [x] Try several prompts, including a prompt unrelated to task
    management.

### Deliverables

-   A working conversational CLI with no task tools yet.

### Acceptance criteria

-   [x] A valid prompt receives a response.
-   [x] Missing API configuration produces an actionable error.
-   [x] API failures do not print secrets or an unhandled stack trace to
    the user.

## Phase 2 --- Implement the first tool

### Tasks

-   [x] Define the `Task` type.
-   [x] Define a Zod schema for task creation.
-   [x] Implement a simple `create_task` tool using in-memory storage
    initially.
-   [x] Generate task IDs in application code.
-   [x] Set `createdAt` and initial status in application code.
-   [x] Restrict priority to `low`, `medium`, or `high`.
-   [x] Register the tool with the agent.
-   [x] Test a natural-language request that should create a task.
-   [x] Verify the final response reflects the tool's actual result.

### Deliverables

-   One agent tool that performs a real application operation.

### Acceptance criteria

-   [x] The model can select `create_task` when appropriate.
-   [x] Valid task details create one task.
-   [x] Invalid or missing titles are rejected.
-   [ ] The model cannot choose its own task ID (true by design) or claim success without
    a successful tool result (prompt-enforced only; the UI chips show the real result).

**Learning checkpoint:** Be able to explain the difference between the
model requesting a tool and your application actually executing it.

## Phase 3 --- Build task operations

### Tasks

-   [x] Implement `list_tasks`.
-   [x] Add optional filters for status and overdue tasks.
-   [x] Implement `complete_task` using a task ID.
-   [x] Return clear results when an ID does not exist.
-   [x] Decide how completing an already-completed task should behave.
-   [x] Register all tools with the agent.
-   [x] Update agent instructions to describe each tool and its intended
    use.
-   [x] Test requests requiring the model to choose different tools.

### Deliverables

-   Create, list, and complete functionality.

### Acceptance criteria

-   [x] The agent selects the correct tool for create/list/complete
    requests.
-   [x] Listing returns actual stored tasks, not invented examples.
-   [x] Unknown IDs return a clear failure.
-   [x] Completing a task updates its status and completion timestamp.
-   [x] Overdue filtering excludes completed tasks and uses a documented
    timezone/date convention.

## Phase 4 --- Add persistent storage

### Tasks

-   [x] Define a task repository interface or module boundary.
-   [x] Implement JSON-file loading and saving.
-   [x] Initialize an empty task collection when the file does not
    exist.
-   [x] Validate parsed JSON before trusting its contents.
-   [x] Handle malformed JSON and file permission errors.
-   [x] Avoid partial writes by writing to a temporary file and renaming
    it where supported.
-   [x] Keep the data file out of version control.
-   [x] Test creating a task, restarting the app, and listing the task.

### Deliverables

-   A JSON-backed repository that survives application restarts.

### Acceptance criteria

-   [x] Existing tasks load at startup or on demand.
-   [x] New and updated tasks are persisted.
-   [x] Missing storage files are handled safely.
-   [x] Corrupt storage does not silently erase user data.
-   [x] The project documents that JSON-file storage is intended for a
    single-process learning application, not concurrent production use.

## Phase 5 --- Bound and harden the agent workflow

### Tasks

-   [x] Set a maximum number of agent/tool iterations supported by the
    SDK.
-   [x] Add clear handling for model timeouts and API errors.
-   [x] Validate every tool argument at runtime.
-   [x] Return structured, concise tool results.
-   [x] Ensure a tool failure is returned as a failure, not a
    success-shaped response.
-   [x] Prevent tools from reading or writing arbitrary filesystem
    paths.
-   [x] Keep task rules in application code rather than relying only on
    prompt instructions.
-   [x] Handle ambiguous dates by asking a clarifying question when
    necessary.
-   [x] Avoid destructive operations; the first version should not
    delete tasks.
-   [x] Review logs to ensure API keys and unnecessary sensitive data
    are not recorded.

### Deliverables

-   A bounded and more predictable agent workflow.

### Acceptance criteria

-   [x] Agent execution cannot continue indefinitely.
-   [x] Invalid inputs and tool errors result in understandable
    responses.
-   [x] The model cannot bypass task validation by generating malformed
    arguments.
-   [x] No unrestricted shell, SQL, or filesystem tool is exposed.

## Phase 6 --- Automated testing

### Tasks

-   [x] Add a test runner, such as Vitest or Node.js's built-in test
    runner.
-   [x] Unit-test task creation and validation.
-   [x] Unit-test listing and filtering.
-   [x] Unit-test task completion and unknown IDs.
-   [x] Test repository load/save behavior.
-   [x] Test missing and malformed JSON files.
-   [x] Test date boundary cases for overdue tasks.
-   [x] Add a small set of agent integration scenarios using mocked
    tool/service boundaries where practical.
-   [x] Keep most tests independent of live model calls.
-   [x] Add a manual smoke-test checklist for the live agent.

### Suggested manual smoke tests

-   [x] "Create a high-priority task to review the stock report due
    tomorrow."
-   [x] "Show all open tasks."
-   [x] "Show overdue tasks."
-   [x] "Complete task `<valid-id>`."
-   [x] "Complete task `not-a-real-id`."
-   [x] "Create a task with an empty title."
-   [x] Restart the app and verify task persistence.
-   [x] Simulate missing API credentials or a network/API failure.

### Deliverables

-   Automated tests and a repeatable manual verification checklist.

### Acceptance criteria

-   [x] Core task and repository tests pass locally.
-   [x] Tests cover success and failure paths.
-   [x] Tests do not require an API key unless explicitly marked as live
    integration tests.

## Phase 7 --- Polish and document

### Tasks

-   [x] Add a README with setup and run commands.
-   [x] Document environment variables and API billing prerequisites.
-   [x] Document supported commands and example natural-language
    requests.
-   [x] Add a concise architecture overview linking to
    `ARCHITECTURE.md`.
-   [x] Document current limitations and common troubleshooting steps.
-   [x] Review package scripts and ensure the app has convenient `dev`
    and `test` commands.
-   [x] Verify the repository contains no secrets or personal task data.

### Deliverables

-   A reproducible project another developer can run locally.

### Acceptance criteria

-   [x] A new developer can follow the README from a clean checkout (verified: npm ci, typecheck, tests, build, CLI key check).
-   [x] Setup, run, and test commands are documented.
-   [x] Known limitations are explicit.

------------------------------------------------------------------------

## 4. Recommended implementation order

Implement one vertical slice at a time:

1.  A single model response.
2.  A single tool with in-memory state.
3.  All three tools with in-memory state.
4.  Persistent JSON storage.
5.  Error handling and bounded execution.
6.  Tests and documentation.

Avoid creating every folder and abstraction before there is working
behavior. Introduce modules when the separation makes the code easier to
test or understand.

## 5. Key design decisions

  -----------------------------------------------------------------------
  Decision                Initial choice          Reason
  ----------------------- ----------------------- -----------------------
  Language                TypeScript              Strong fit for the
                                                  existing Node.js skill
                                                  set.

  Agent framework         @google/genai          Official Gemini SDK; the
                          (Gemini)               bounded tool loop is
                                                 app-owned behind a
                                                 provider interface.

  Input validation        Zod                     Runtime validation for
                                                  tool arguments.

  Storage                 JSON file               Minimal setup for a
                                                  single-user prototype.

  Interface               CLI                     Keeps focus on agent
                                                  behavior rather than UI
                                                  work.

  Agent count             One                     Easier to understand,
                                                  test, and debug.

  Tool permissions        Explicit allowlist      Reduces accidental or
                                                  unauthorized actions.

  Testing                 Mostly local/unit tests Fast, repeatable
                                                  feedback without
                                                  relying on live model
                                                  output.
  -----------------------------------------------------------------------

## 6. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Model invents task details or       Base confirmations on tool results;
  reports false success               validate inputs and outputs.

  Ambiguous dates such as "tomorrow"  Define timezone handling and
                                      clarify when necessary.

  JSON corruption or lost updates     Validate file contents, use safer
                                      writes, and migrate storage if
                                      concurrency is needed.

  API cost or repeated tool calls     Set usage limits, bound agent
                                      turns, and keep test prompts small.

  Prompt injection in user content    Keep tools narrow and enforce
                                      authorization and validation in
                                      code.

  SDK API changes                     Follow current official
                                      documentation and pin dependency
                                      versions in the lockfile.

  Tests become flaky due to LLM       Unit-test deterministic application
  variation                           logic; keep live-model tests
                                      separate.
  -----------------------------------------------------------------------

## 7. Future backlog --- not part of Version 1

Only consider these after Version 1 meets its acceptance criteria:

-   [ ] Replace JSON persistence with SQLite or PostgreSQL.
-   [x] Add a REST API and Next.js interface (done in V1, see FRONTEND_PLAN.md).
-   [ ] Add authentication and per-user task ownership.
-   [ ] Add reminders through a scheduler and notification channel.
-   [ ] Add task search over notes or documents if a real need emerges.
-   [ ] Add observability, traces, evaluation datasets, and cost
    monitoring.
-   [ ] Add integrations such as calendars or project management
    systems.
-   [ ] Consider multiple agents only if a measurable need justifies the
    extra complexity.

## 8. Final release checklist

-   [x] All Version 1 features work end-to-end (verified live on Gemini: CLI and web).
-   [x] All core tests pass.
-   [x] Task data persists across restarts.
-   [x] Invalid inputs and unknown task IDs fail safely.
-   [x] Agent/tool execution is bounded.
-   [x] Secrets and local data are excluded from Git.
-   [x] README setup instructions work from a clean checkout.
-   [x] `ARCHITECTURE.md` and this `BUILDPLAN.md` match the implemented
    behavior.
