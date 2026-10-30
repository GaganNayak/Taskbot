# Product Requirements Document (PRD)

## Task Management AI Agent

**Document status:** Draft for implementation\
**Version:** 1.0\
**Product type:** Single-user, command-line AI assistant\
**Related document:** `ARCHITECTURE.md`, `BUILDPLAN.md`

------------------------------------------------------------------------

## 1. Executive summary

The Task Management AI Agent is a small application that allows a user
to manage tasks using natural language. Rather than requiring the user
to memorize commands, the user can ask the agent to create tasks, list
tasks, filter overdue work, or mark tasks complete.

The first release is a learning-oriented prototype built with
TypeScript, Node.js, the Google Gen AI SDK (Gemini), Zod, and local JSON-file
persistence. The product prioritizes understandable architecture,
controlled tool use, and testable business logic over a broad feature
set.

## 2. Problem statement

Traditional command-line task tools require structured commands and do
not naturally interpret requests such as "Add a high-priority task to
review the stock report tomorrow." A natural-language interface can
reduce interaction friction, while application-owned tools keep actual
task operations deterministic and auditable.

## 3. Product vision

Provide a simple, reliable task assistant that translates
natural-language requests into validated task operations and clearly
reports the result.

## 4. Goals and success metrics

### Goals

-   Allow users to create, view, filter, and complete tasks through
    natural language.
-   Demonstrate the core AI agent pattern: model interpretation, tool
    selection, tool execution, and final response.
-   Persist task data between application runs.
-   Keep core task rules independent from model-generated text.
-   Provide a small codebase that a developer can understand and extend.

### Success metrics for the prototype

  -----------------------------------------------------------------------
  Metric                              Target
  ----------------------------------- -----------------------------------
  Core task operations                Create, list, filter, and complete
                                      all work end-to-end

  Persistence                         Tasks remain after a normal
                                      application restart

  Validation                          Invalid task inputs are rejected by
                                      application code

  Test coverage of behavior           Tests cover success and error paths
                                      for core service/repository logic

  Safe execution                      Agent can only invoke explicitly
                                      registered task tools

  Setup reproducibility               A developer can run the app by
                                      following the README

  Secret hygiene                      API keys and local task data are
                                      excluded from Git
  -----------------------------------------------------------------------

These are prototype acceptance targets, not claims about production
reliability or model accuracy.

## 5. Target users

### Primary user

A developer learning how to build AI agents who wants a practical
project that can be completed incrementally.

### Secondary user

An individual who wants a lightweight local task manager and is
comfortable running a Node.js CLI application.

### Out of scope users

The first release is not intended for teams, multiple accounts, or
organizations requiring shared task ownership and access controls.

## 6. Product scope

### In scope for Version 1

-   Natural-language CLI interaction.
-   Create tasks with title, optional description, priority, and
    optional due date.
-   List tasks.
-   Filter by open/completed status.
-   Filter overdue tasks.
-   Complete a task by ID.
-   Local JSON persistence.
-   Input validation and clear errors.
-   Bounded agent execution.
-   Automated tests and setup documentation.

### Out of scope for Version 1

-   Web or mobile UI.
-   User registration, authentication, and multi-user access.
-   Task deletion or bulk destructive actions.
-   Recurring tasks, notifications, or scheduled reminders.
-   Email and calendar integrations.
-   Arbitrary SQL, shell commands, or unrestricted filesystem access.
-   RAG, embeddings, vector databases, and multi-agent orchestration.
-   Production-scale concurrent access.

## 7. User stories

1.  **Create a task:** As a user, I want to describe a task in natural
    language so that I can capture work quickly.
2.  **Set priority:** As a user, I want to assign low, medium, or high
    priority so that I can distinguish urgency.
3.  **Set a due date:** As a user, I want to specify a due date in
    natural language so that the application stores a normalized date.
4.  **View tasks:** As a user, I want to list tasks so that I can review
    my work.
5.  **Filter tasks:** As a user, I want to view only open, completed, or
    overdue tasks.
6.  **Complete a task:** As a user, I want to mark a task complete by
    identifying it unambiguously.
7.  **Recover from errors:** As a user, I want clear feedback when a
    task is invalid, missing, or cannot be saved.
8.  **Keep task data:** As a user, I want tasks to remain available
    after I restart the application.

## 8. Typical user journeys

### Journey A: Create a task

1.  User enters "Create a high-priority task to review the stock report
    due tomorrow."
2.  Agent determines that `create_task` is appropriate.
3.  The tool validates the title, priority, and due date.
4.  Task service assigns an ID, timestamps, and initial status.
5.  Repository persists the record.
6.  Agent confirms the task using the tool result.

If the due date is ambiguous or cannot be resolved safely, the agent
should ask for clarification rather than inventing a date.

### Journey B: Review overdue tasks

1.  User asks "Show my overdue tasks."
2.  Agent invokes `list_tasks` with the overdue filter.
3.  Application filters incomplete tasks whose due dates are earlier
    than the current business date.
4.  Agent summarizes the returned records without inventing additional
    tasks.

### Journey C: Complete a task

1.  User requests completion of a task.
2.  If the request identifies a task unambiguously, the agent calls
    `complete_task` with its ID.
3.  The service verifies the task exists and updates its status and
    completion timestamp.
4.  The agent reports the actual result.
5.  If multiple tasks match the description and the intended task is
    unclear, the agent asks the user to identify the correct task.

## 9. Functional capabilities at a glance

  Capability                              Priority    Release
  --------------------------------------- ----------- ---------
  Natural-language CLI                    Must have   V1
  Create task                             Must have   V1
  List tasks                              Must have   V1
  Filter by status                        Must have   V1
  Filter overdue tasks                    Must have   V1
  Complete task                           Must have   V1
  JSON persistence                        Must have   V1
  Runtime schema validation               Must have   V1
  Error handling and bounded agent loop   Must have   V1
  Automated tests                         Must have   V1
  Next.js interface                       Should      V1 (added)
  PostgreSQL                              Future      Later
  Reminders and integrations              Future      Later

## 10. Product rules

-   A task title is required and must not be empty or whitespace-only.
-   Priority is one of `low`, `medium`, or `high`.
-   New tasks start with status `open`.
-   The application generates task IDs and timestamps.
-   A completed task has status `completed` and a `completedAt`
    timestamp.
-   An open task with a due date earlier than the current business date
    is overdue.
-   Completed tasks are not overdue.
-   The date/timezone convention must be documented and applied
    consistently.
-   The agent must not report an operation as successful unless the
    corresponding tool confirms success.
-   The model must not invent records when the repository returns no
    matching data.
-   The first version does not support task deletion.

## 11. Non-functional requirements

### Security

-   API keys must be read from environment variables and excluded from
    version control.
-   The model can invoke only explicitly registered tools.
-   Tool arguments are validated at runtime.
-   No arbitrary shell, SQL, or unrestricted file operation is exposed.
-   Logs must not contain API keys.

### Reliability

-   Missing, malformed, or inaccessible storage must produce a
    controlled error.
-   Model/API errors and tool failures must be handled gracefully.
-   Agent execution must have a configured limit to avoid unbounded tool
    loops.
-   JSON persistence is explicitly single-process and not designed for
    concurrent writers.

### Maintainability

-   Separate agent setup, tool definitions, task service, repository,
    schemas, and types.
-   Keep business rules in ordinary TypeScript functions, not only in
    prompts.
-   Pin dependencies through the package lockfile.
-   Include setup instructions and tests.

### Usability

-   Accept plain-language task requests.
-   Display concise, understandable confirmations and errors.
-   Ask clarifying questions when the requested task or date cannot be
    determined reliably.

### Cost

-   Use small test prompts and avoid unnecessary model calls.
-   Keep most automated tests independent of live API requests.
-   API usage may incur separate charges; consumer Gemini or ChatGPT subscriptions do not
    necessarily include API credits.

## 12. Assumptions and constraints

-   Version 1 is for one user running one local process.
-   The developer has Node.js and npm installed.
-   A Gemini API key (Google AI Studio) is available; the LLM provider is pluggable (OpenAI is a possible future provider).
-   The model and SDK may change; implementation must follow the current
    official SDK documentation.
-   JSON-file persistence is an intentional learning trade-off, not a
    production database recommendation.

## 13. Risks and mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  Model misinterprets a request       Validate arguments and clarify
                                      ambiguity

  False success message               Ground confirmations in tool
                                      results

  Date ambiguity                      Define timezone and ask when
                                      uncertain

  File corruption or lost updates     Validate data and use safer writes;
                                      migrate storage if needed

  Repeated tool calls and unexpected  Bound agent execution and monitor
  cost                                usage

  Prompt injection                    Keep tools narrow and enforce rules
                                      in code

  SDK changes                         Pin versions and consult official
                                      documentation
  -----------------------------------------------------------------------

## 14. Release acceptance criteria

Version 1 is accepted when:

-   A user can create, list, filter, and complete tasks through the CLI.
-   Task records survive application restarts.
-   Invalid titles, priorities, dates, and task IDs are handled safely.
-   The agent reports success only when the application operation
    succeeds.
-   Core service and repository tests pass.
-   Agent execution is bounded.
-   Secrets and local task data are not tracked by Git.
-   A clean-checkout setup is documented in the README.
-   `ARCHITECTURE.md`, `BUILDPLAN.md`, and the implementation remain
    consistent.

## 15. Future opportunities

After Version 1 is stable, consider:

-   (Done in V1: REST API and Next.js interface. Remaining: authentication before any non-local use.)
-   SQLite for simple local deployments or PostgreSQL for server-backed
    use.
-   Authentication and per-user task ownership.
-   Reminders and scheduled tasks.
-   Calendar or project-management integrations.
-   Tracing, evaluation datasets, and cost monitoring.
-   Document retrieval if the product needs to answer questions from
    unstructured content.
-   Multi-agent orchestration only if it provides a clear benefit.

## 16. References

-   `ARCHITECTURE.md` --- components, data flow, security boundaries,
    and sequence diagram.
-   `BUILDPLAN.md` --- phased implementation tasks and acceptance
    criteria.
-   [Gemini function calling
    guide](https://ai.google.dev/gemini-api/docs/function-calling)
-   [Google Gen AI SDK
    guide](https://github.com/googleapis/js-genai)
