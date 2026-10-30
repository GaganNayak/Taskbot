# Build Log

Continuity record for the Task Management AI Agent. Update it when work begins, a decision is made, a milestone changes, or verification runs.

## Current status

- **Current phase:** **Version 1 complete** (CLI and web UI, Gemini).
- **Next action:** Commit V1. Backlog (not started): authentication, SQLite/Postgres, streaming, reminders, OpenAI provider.

## Decisions

- Single-user, single-process TypeScript CLI with explicit tools and local JSON persistence.
- Provider: Gemini via `@google/genai`. The tool loop is written in-app (`src/llm/gemini.ts`) with `automaticFunctionCalling` disabled, so the turn limit (`MAX_AGENT_TURNS = 6`) and tool execution are fully ours. Tools and the provider are SDK-neutral (`src/llm/types.ts`); adding OpenAI means one new `LlmProvider` file and a branch in `src/llm/index.ts`.
- Default model `gemini-3.5-flash`, overridable via `GEMINI_MODEL`.
- Business timezone `Asia/Kolkata`; completion requires an explicit task ID; repeated completion is an idempotent no-op.
- Tool validation failures return the Zod messages to the model as `ok: false`.

## Activity log

### 2026-10-29

- Restarted the code from Phase 0 (docs kept) to switch from the OpenAI Agents SDK to Gemini; previous `src/`, `tests/` and dependencies were removed.
- Rebuilt types, schemas, repository, service, tools, Gemini provider, agent and CLI. Updated PRD/FRD/ARCHITECTURE/BUILDPLAN/README for Gemini.

## Verification history

- `npm run typecheck` passes.
- `npm test` passes: 22 tests (service, repository incl. write failure and restart reload, tools, Gemini loop with a fake client: tool execution, unknown tool, turn limit, API error).
- `npm run dev` without `GEMINI_API_KEY` exits with an actionable error.
- Live smoke test (2026-10-29, `gemini-3.5-flash`): create with "tomorrow" resolved to the correct date, list, overdue, unknown ID, empty title, ambiguous date asked for clarification, complete by ID in a later process (persistence across restart). Default model changed from `gemini-2.5-flash` (404 for new users) to `gemini-3.5-flash`; 30s request timeout and one retry on 429/5xx added.

## Web UI (see FRONTEND_PLAN.md)

- 2026-10-29: Decisions D1-D6 approved as recommended. **F0 done**: Next.js 16 + Tailwind 4 + shadcn/ui installed in the same repo; `tsconfig` moved to bundler resolution with `@/*` alias; scripts `dev:web`, `build`, `start:web`. `typecheck`, 22 tests, `next build` and the CLI all still pass.
- **F1 done**: task API (GET/POST /api/tasks, POST /api/tasks/[id]/complete, GET /api/health) with testable handlers in src/lib/handlers.ts, a write lock inside TaskService, and 4 new tests (26 total). Verified live with curl. Relative imports no longer use .js suffixes because Turbopack could not resolve them.
- **F2 done**: task board (tabs with counts, rows, Complete button, detail sheet, New task dialog, loading/empty/error states). Replaced shadcn's unknown `cn` npm package with clsx + tailwind-merge. Shared browser-safe date helpers in `src/lib/business-date.ts`. Typecheck, 26 tests and `next build` pass; page serves 200. **Not yet seen in a browser** (no browser tooling here); needs a manual click-through.
- **F3 done**: `POST /api/chat` (`chatHandler` in `src/lib/handlers.ts`). `LlmProvider.run` now takes history and returns `{ text, toolCalls }` (the real tool trace). Earlier tool results are replayed as text so "complete the first one" works (D2). Errors map to HTTP: bad input 400, missing key 503, turn limit 422, model 429 quota / 504 timeout / 502 other, rate limit (10/min) 429. 37 tests pass; verified live through the web API: create with "tomorrow", list, multi-turn complete from history, empty message 400. Instructions tweaked so the model omits a description that just repeats the title.
- **F4 done**: chat panel (messages, suggested prompts, Enter/Shift+Enter, working skeleton, error bubble with Retry, Clear), tool chips derived from real tool results (`src/lib/tool-labels.ts`, unit-tested), board refresh + row highlight after the assistant creates/completes tasks. Chat history is browser-only, last 10 messages sent. 39 tests pass; page serves with the assistant panel. **Not yet seen in a browser**; needs a manual click-through.
- **F5 done**: dark mode (next-themes, toggle in header), read-only Status dialog (provider, model, key configured, timezone, storage), missing-key banner (board still works), mobile Chat/Tasks tabs below the md breakpoint, page metadata. Labels, live regions, aria-labels on icon buttons in place. Typecheck and 39 tests pass; page and `/api/health` serve. **Not yet seen in a browser.**
- **Chat task cards**: list results render as a horizontal snap-scroll strip of cards (priority + status/overdue chips, Complete button) under the reply; cards show live status from the board. Shared `useCompleteTask` hook for board and cards; `**bold**` rendered; web chat tells the model to keep list replies short (CLI unchanged). Layout: tasks left / chat right on desktop, tasks top / chat bottom on mobile. 42 tests pass. **Not yet seen in a browser.**
- **Fixes after UI testing**: (1) JSON leaking into replies — earlier tool results are now passed as reference data in the system instruction instead of inside the model's own turns, and any leaked `[Tool results ...]` block is stripped from replies/history. (2) Scope guardrails — instructions restrict the assistant to task management (off-topic requests get a one-line refusal, injection attempts ignored), plus a code-level backstop that replaces any code-block reply made without a task tool. 45 tests pass; verified live: code request, general knowledge, prompt injection (all refused), greeting, create, list, and multi-turn complete with no JSON in replies.

- **F6 done / V1 closed (2026-10-29)**: README rewritten (setup, web UI, API, smoke test, limits); ARCHITECTURE section 13, PRD/BUILDPLAN/FRONTEND_PLAN updated to match what was built. Final verification: typecheck, 45 tests, `next build` pass; clean-checkout copy (no node_modules/.env/.next/tasks.json) passes `npm ci`, tests, build and the CLI missing-key message; `.env`, `tasks.json`, `.next`, `node_modules` are git-ignored. `npm audit`: 3 low findings, all in the shadcn CLI tooling, not fixed (only a breaking `--force` fix is offered). Known V1 limits: prompt-level scope guardrails, single process only, no auth, no streaming.
- **Top bar**: full-width bar with branding (left) and dark/light toggle + menu (right: theme Light/Dark/System, Status and settings). Status dialog is now opened from the menu. 45 tests pass; page serves with the new bar. Not yet seen in a browser.
