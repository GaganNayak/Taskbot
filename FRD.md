# Functional Requirements Document (FRD)

## Task Management AI Agent

**Document status:** Draft for implementation\
**Version:** 1.0\
**Related documents:** `PRD.md`, `ARCHITECTURE.md`, `BUILDPLAN.md`

------------------------------------------------------------------------

## 1. Purpose

This document defines the functional behavior of the Task Management AI
Agent, including user interaction, task operations, validation,
persistence, error handling, and acceptance tests.

The first release is a single-user command-line application built with
TypeScript, Node.js, the Google Gen AI SDK (Gemini), Zod, and a local JSON file.

## 2. System boundary

### Inputs

-   Natural-language text entered by the user.
-   Model-generated tool-call arguments.
-   Existing task records from local storage.

### Outputs

-   User-facing responses printed in the CLI.
-   Task records created or updated in local storage.
-   Controlled error messages for invalid or failed operations.

### External dependency

The Gemini API is used through the @google/genai SDK behind a provider interface (src/llm). Application correctness
must not depend solely on model instructions; task validation and
business rules must execute in application code.

## 3. Functional requirements

Priority definitions: - **Must:** required for Version 1. - **Should:**
desirable if time permits without delaying core functionality. -
**Could:** optional future enhancement.

### FR-001 --- Start the application

**Priority:** Must

The application shall start from a documented npm command and initialize
the CLI and agent configuration.

**Acceptance criteria** - Given valid configuration, the application
starts and accepts user input. - Given a missing API key, the
application shows an actionable configuration error. - The application
does not display or log the secret value.

### FR-002 --- Accept natural-language requests

**Priority:** Must

The application shall accept a user's natural-language request and pass
it to the agent.

**Acceptance criteria** - A task-related request is processed by the
agent. - The agent uses registered tools when an operation requires task
data or a mutation. - The application displays the agent's final
response. - Empty input is rejected or ignored with clear feedback.

### FR-003 --- Create a task

**Priority:** Must

The system shall create a task through the `create_task` tool.

**Inputs** - `title`: required string. - `description`: optional
string. - `priority`: optional enum; defaults to `medium`. - `dueDate`:
optional ISO date (`YYYY-MM-DD`) after normalization.

**Processing** 1. Validate tool arguments. 2. Reject an empty or
whitespace-only title. 3. Validate priority and date. 4. Generate a
unique ID and creation timestamp in application code. 5. Set status to
`open`. 6. Persist the task. 7. Return the saved task or a structured
failure.

**Acceptance criteria** - A valid request creates exactly one task. -
The saved task contains an ID, title, priority, status, and creation
timestamp. - Invalid input does not create a record. - The user is not
told the task was created if persistence fails.

### FR-004 --- List tasks

**Priority:** Must

The system shall return stored tasks through the `list_tasks` tool.

**Optional filters** - `status`: `open` or `completed`. - `overdue`:
boolean.

**Processing rules** - No filters returns all tasks. - A status filter
returns only tasks with the selected status. - An overdue filter returns
tasks that are open, have a due date, and have a due date earlier than
the current business date. - Filters supplied together are combined with
AND semantics. - Empty results are returned as an empty collection, not
fabricated data.

**Acceptance criteria** - The result reflects repository contents. -
Filters return only matching records. - Completed tasks never appear in
overdue results. - An empty result is explained clearly to the user.

### FR-005 --- Complete a task

**Priority:** Must

The system shall mark a task complete through `complete_task`.

**Input** - `taskId`: required non-empty string.

**Processing** 1. Validate the task ID. 2. Find the matching task. 3. If
no task exists, return a not-found result. 4. Set status to `completed`.
5. Set `completedAt` to the current timestamp. 6. Persist the update. 7.
Return the updated task.

**Acceptance criteria** - A valid ID updates the correct task. - A
nonexistent ID does not modify any record. - Completing an
already-completed task is handled consistently and documented; it must
not create duplicate tasks. - A storage failure is not reported as
success.

### FR-006 --- Resolve natural-language dates

**Priority:** Must

The agent shall interpret common date expressions, such as "tomorrow,"
when creating a task.

**Rules** - Normalize accepted due dates to `YYYY-MM-DD`. - Use one
documented timezone convention consistently. - Ask for clarification
when the date is ambiguous or cannot be resolved with sufficient
confidence. - Do not invent a date if the request does not provide
enough information.

**Acceptance criteria** - A valid unambiguous date is saved in
normalized form. - Invalid calendar dates are rejected. - Date boundary
tests cover the selected timezone convention. - The user can clarify an
ambiguous date before a task is created.

### FR-007 --- Persist tasks

**Priority:** Must

The repository shall persist task data in `tasks.json` for the local
prototype.

**Rules** - A missing file represents an empty task collection on first
run. - Existing data must be parsed and validated before use. - Writes
should use a temporary file and rename strategy where supported to
reduce the risk of partial writes. - Malformed data or permission errors
must be surfaced as controlled errors. - The system must not silently
replace corrupted data with an empty collection.

**Acceptance criteria** - Tasks remain available after normal
application restart. - A missing file is initialized safely. - Malformed
JSON produces a clear error and preserves the original file for
recovery. - The limitations of single-process JSON persistence are
documented.

### FR-008 --- Validate tool inputs

**Priority:** Must

All model-supplied tool arguments shall be validated at runtime using
Zod or equivalent validation.

**Acceptance criteria** - Invalid priority values are rejected. -
Missing or empty required fields are rejected. - Due dates follow the
specified format and calendar validity rules. - Tool validation is
performed in application code even if the model is instructed to produce
valid arguments.

### FR-009 --- Report operation outcomes accurately

**Priority:** Must

The agent shall base its confirmation on the actual tool result.

**Acceptance criteria** - Successful mutations are confirmed using
returned task data. - Failed operations are reported as failures. -
Empty query results are not replaced with invented records. - The agent
does not claim an action succeeded when a tool was not executed or
returned an error.

### FR-010 --- Bound agent execution

**Priority:** Must

The application shall limit agent/tool execution to prevent unbounded
loops and excessive API usage.

**Acceptance criteria** - A configured maximum execution/turn limit is
enforced using the supported SDK mechanism. - Exceeding the limit
returns a controlled message. - API errors and timeouts do not crash the
CLI with an unhandled rejection. - The implementation follows the
current installed SDK's documented options.

### FR-011 --- Protect configuration and local data

**Priority:** Must

The application shall protect API credentials and local task data from
accidental source-control disclosure.

**Acceptance criteria** - The API key is loaded from an environment
variable. - `.env` and `tasks.json` are ignored by Git. - `.env.example`
contains placeholders only. - Logs and error messages do not reveal the
API key.

### FR-012 --- Provide clear CLI feedback

**Priority:** Must

The CLI shall display understandable confirmations, query results, and
errors.

**Acceptance criteria** - Create and complete operations identify the
affected task. - List operations display useful task fields, including
ID, title, priority, due date when present, and status. - Not-found and
validation errors explain what the user can correct. - The user can
submit another request after a recoverable error.

### FR-013 --- Test core business behavior

**Priority:** Must

The project shall include automated tests for task services and
persistence.

**Minimum test coverage** - Valid task creation. - Invalid title and
priority. - Listing all tasks. - Status filtering. - Overdue filtering,
including due-date boundaries. - Successful completion. - Unknown task
ID. - Persistence across repository reload. - Missing and malformed JSON
files. - Persistence failure handling.

**Acceptance criteria** - Tests can run locally using a documented
command. - Most tests do not require live API calls. - Live-model
integration tests, if included, are separated from the default test
suite.

### FR-014 --- Document setup and operation

**Priority:** Must

The project shall document installation, configuration, execution,
testing, supported requests, and known limitations.

**Acceptance criteria** - A developer can set up the project from a
clean checkout by following the README. - Documentation links to
`ARCHITECTURE.md`, `BUILDPLAN.md`, `PRD.md`, and `FRD.md`. - The
documentation explains that API usage may incur separate charges.

------------------------------------------------------------------------

## 4. Data requirements

### 4.1 Task entity

  -----------------------------------------------------------------------
  Field             Type              Required          Rules
  ----------------- ----------------- ----------------- -----------------
  `id`              String            Yes               Unique; generated
                                                        by application
                                                        code

  `title`           String            Yes               Non-empty after
                                                        trimming

  `description`     String            No                Optional
                                                        user-provided
                                                        detail

  `priority`        Enum              Yes               `low`, `medium`,
                                                        or `high`;
                                                        default `medium`

  `dueDate`         String            No                Valid ISO
                                                        calendar date,
                                                        `YYYY-MM-DD`

  `status`          Enum              Yes               `open` or
                                                        `completed`;
                                                        initial value
                                                        `open`

  `createdAt`       String            Yes               ISO 8601
                                                        timestamp

  `completedAt`     String            No                ISO 8601
                                                        timestamp when
                                                        completed
  -----------------------------------------------------------------------

### 4.2 Data integrity rules

-   The application generates IDs and timestamps.
-   Task IDs must be unique.
-   A task's status must be a supported enum value.
-   A task without a due date is not overdue.
-   Completed tasks are not overdue.
-   Invalid persisted records must not be silently accepted.
-   A failed write must not produce a success confirmation.

## 5. Tool contracts

The following contracts describe expected behavior; exact SDK schema
syntax belongs in the implementation.

### `create_task`

Example input:

``` json
{
  "title": "Review the stock report",
  "description": "Check branch-level discrepancies",
  "priority": "high",
  "dueDate": "2026-10-29"
}
```

Expected result: a created task record with generated ID, status `open`,
and `createdAt`.

### `list_tasks`

Example input:

``` json
{
  "status": "open",
  "overdue": true
}
```

Expected result: a collection of tasks matching both filters. If no
tasks match, return an empty collection.

### `complete_task`

Example input:

``` json
{
  "taskId": "task-generated-id"
}
```

Expected result: the updated task record, or a structured
not-found/failure result.

## 6. Error handling requirements

  -----------------------------------------------------------------------
  Condition                           Expected behavior
  ----------------------------------- -----------------------------------
  Missing API key                     Stop startup or disable agent
                                      execution with configuration
                                      guidance

  API/network failure                 Show a controlled error; do not
                                      claim the task operation succeeded

  Invalid tool arguments              Reject the operation and return
                                      validation feedback

  Task not found                      Return a not-found result; make no
                                      changes

  Malformed JSON file                 Preserve the original file and
                                      report a storage error

  File permission/write error         Report failure and do not claim
                                      persistence succeeded

  Ambiguous task reference            Ask the user to clarify

  Ambiguous date                      Ask for clarification rather than
                                      guessing

  Agent execution limit reached       Stop safely and explain that the
                                      request could not be completed
                                      within the limit
  -----------------------------------------------------------------------

Errors returned to the model should be concise and should not contain
secrets, full environment contents, or unnecessary internal stack
traces.

## 7. Non-functional requirements

### Performance

For a small local task collection, task operations should complete
without noticeable delay apart from model/API latency. No strict
response-time SLA is defined for Version 1.

### Security

-   Explicit allowlist of tools.
-   Runtime validation for all tool inputs.
-   No arbitrary SQL, shell execution, or unrestricted filesystem
    operations.
-   Secrets excluded from source control and logs.

### Maintainability

-   Task business logic is independent of agent prompts.
-   Repository operations are testable without a live model.
-   Types and validation schemas are centralized.
-   Dependency versions are locked.

### Portability

The application should run on supported Node.js environments where the
chosen SDK and dependencies are supported. The README must state the
tested Node.js version.

## 8. Acceptance test scenarios

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  AT-01                   Create a task with      Task saved with default
                          title only              priority and open
                                                  status

  AT-02                   Create a task with high Fields are saved
                          priority and valid due  correctly
                          date                    

  AT-03                   Create a task with      Validation failure; no
                          blank title             task created

  AT-04                   List tasks with no      All stored tasks
                          filters                 returned

  AT-05                   List only completed     Only completed tasks
                          tasks                   returned

  AT-06                   List overdue tasks      Only open tasks with
                                                  past due dates returned

  AT-07                   Complete an existing    Correct task becomes
                          task                    completed with
                                                  timestamp

  AT-08                   Complete a nonexistent  Not-found result; no
                          task                    record changed

  AT-09                   Restart the app and     Previously saved tasks
                          list tasks              remain

  AT-10                   Load malformed JSON     Controlled storage
                                                  error; original data is
                                                  preserved

  AT-11                   Simulate API failure    Controlled error; no
                                                  false success
                                                  confirmation

  AT-12                   Submit ambiguous date   Clarification requested
                                                  before saving

  AT-13                   Exceed agent execution  Execution stops safely
                          limit                   

  AT-14                   Inspect Git status      `.env` and `tasks.json`
                                                  are not tracked
  -----------------------------------------------------------------------

## 9. Requirement traceability

  Product goal                       Related functional requirements
  ---------------------------------- ------------------------------------------------
  Natural-language task management   FR-002, FR-003, FR-004, FR-005
  Correct task data                  FR-003, FR-004, FR-005, FR-006, FR-007, FR-008
  Safe agent behavior                FR-008, FR-009, FR-010, FR-011
  Usable CLI                         FR-001, FR-002, FR-012
  Maintainable learning project      FR-013, FR-014

## 10. Open implementation decisions

Resolve these during implementation and document the selected behavior:

1.  **Timezone:** choose and document the timezone used for interpreting
    relative dates and overdue calculations.
2.  **Task matching:** decide whether the agent may resolve a task by
    title or must ask for an ID when multiple tasks match.
3.  **Repeated completion:** choose whether completing an
    already-completed task returns the existing completed record or a
    specific no-op response.
4.  **JSON write strategy:** confirm the temporary-file-and-rename
    behavior on supported operating systems.
5.  **SDK limits:** use the current SDK's supported option for bounding
    agent execution and verify it with a test.

## 11. References

-   `PRD.md` --- product goals, scope, users, and release success
    criteria.
-   `ARCHITECTURE.md` --- component architecture, data flow, and trust
    boundaries.
-   `BUILDPLAN.md` --- phases, tasks, effort estimates, and
    implementation checkpoints.
-   [Gemini function calling
    guide](https://ai.google.dev/gemini-api/docs/function-calling)
-   [Google Gen AI SDK
    guide](https://github.com/googleapis/js-genai)
