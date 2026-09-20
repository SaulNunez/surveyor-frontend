# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (turbopack) on :3000
npm run build        # production build (needs DATABASE_URL and NEXTAUTH_SECRET set)
npm run lint         # eslint (next/core-web-vitals)
npm run typecheck    # tsc --noEmit
npm test             # vitest run — REQUIRES a running Docker daemon
npm run test:watch
npm run db:generate  # drizzle-kit generate: emit a migration from libs/db/schema.ts
npm run db:migrate   # drizzle-kit migrate: apply migrations in drizzle/
```

Run a single test file / single test:

```bash
npx vitest run test/attemptService.test.ts
npx vitest run test/attemptService.test.ts -t 'should manage attempts'
```

CI (`.github/workflows/test.yml`) runs lint → typecheck → build → test on a bare
`ubuntu-latest` runner — the suite brings its own database — so all four must
pass locally before pushing.

## Environment

Copy `.env.example` to `.env`. `DATABASE_URL` is required by the app and by
drizzle-kit; the test suite ignores it and provisions its own database (see
*Testing model*). `docker-compose up` brings up the app plus a Postgres 15
volume; the `Dockerfile` builds the Next.js `output: "standalone"` bundle.

The app applies pending migrations itself on startup: `instrumentation.ts` calls
`runMigrations()` (`libs/db/migrate.ts`, drizzle's runtime migrator under a
Postgres advisory lock) before the server takes requests, in both `next dev` and
the standalone image (which copies `drizzle/` in). `npm run db:migrate` still
works for applying them by hand.

## Testing model

Tests are **integration tests against a real database**, not unit tests with mocks:

- `test/globalSetup.ts` starts a throwaway `postgres:15` container with
  testcontainers and applies `drizzle/` to it through the app's own
  `runMigrations()`, then publishes the connection string with
  `project.provide('databaseUrl', …)`; `teardown()` stops the container. A schema
  change therefore needs **only** a drizzle migration — there is no second copy
  of the schema to keep in sync, and every run exercises the migrations.
- Running `npm test` needs Docker, not a live Postgres. Set `TEST_DATABASE_URL`
  to use an already-running database instead and skip the container; plain
  `DATABASE_URL` is deliberately ignored, since this setup drops and truncates
  whatever it is pointed at.
- `test/setup.ts` sets `process.env.DATABASE_URL` from `inject('databaseUrl')`
  **before** dynamically importing `libs/db` — the pool in `libs/db/index.ts` is
  built at module-evaluation time, so a static import there would bind the wrong
  URL — then `TRUNCATE`s every table before each test. `test/vitest.d.ts` types
  the provided value.
- `fileParallelism: false` in `vitest.config.ts`, because all files share the one
  database.

Tests target service functions in `libs/services/`, seeding rows directly with
drizzle.

## Architecture

Next.js 15 App Router, React 19, Tailwind v4, TypeScript strict, `@/*` → repo root.

**Three layers, strictly ordered:**

1. `libs/db/` — drizzle schema (`schema.ts`), pool/`db` singleton (`index.ts`),
   and `Executor` (`executor.ts`): the union of `db` and a transaction handle.
   Service functions take `executor: Executor = db` as their last parameter so a
   route can compose several of them into one `db.transaction()`. Preserve this
   parameter when adding services.
2. `libs/services/` — all data access and authorization. Services throw
   `NotFoundError` / `InvalidOperationError` (`libs/models/Errors/`); routes map
   those onto status codes. Ownership checks live here and deliberately throw
   `NotFoundError` (not a 403) when a row belongs to another user, so the API
   does not leak existence.
3. `app/api/**/route.ts` — thin: `auth()` for the session, parse/validate the
   body, call services, translate errors. Client pages under `app/` are
   `"use client"` and talk to these routes via TanStack Query (`fetch` + JSON).

**Type flow.** `libs/models/frontend/` holds the wire types shared by routes and
client pages: `question.ts` (`QuestionInput` / `QuestionDao`), `result.ts`
(`QuestionResponseInput` / `...Dao`), `survey.ts` (`SurveyInput`, `SurveyDao`,
summary types). All are discriminated unions on `questionType`, one of
`'open-ended' | 'multiple-choice' | 'binary-choice' | 'likert-scale'`. Adding a
question type means touching every switch over that discriminant.

**Survey public ids.** `surveys` carries a `public_id` alongside its uuid
primary key: six base64url characters, generated in `libs/db/publicId.ts` and
kept unique by the `surveys_public_id_unique` constraint. That code is the
survey's identity everywhere outside the database — it is what URLs carry, what
`SurveyDao.id` / `SurveySummaryDao.id` hold, and what every service takes as its
survey argument. Foreign keys still point at the uuid, so services resolve the
code with `resolveSurveyId` (`surveyService.ts`) before touching questions or
attempts, and translate back on the way out — `toAttempt` takes the public id as
a parameter for exactly that reason. The uuid must not reach a client. A survey
is created with `createSurvey`, which retries on a unique violation rather than
checking whether a code is free first; six characters is only 36 bits.

**Single-table inheritance.** `questions` and `responses` each store all four
variants in one table with nullable per-variant columns
(`options`, `positive_label`/`negative_label`; `response`, `selected_option`,
`choice`, `rating`). Writers must null out every column that does not belong to
the current type — see `toResponseColumns` in `responseService.ts` — so a type
change cannot leave a stale value behind.

**Attempts and concurrency.** The invariant is *at most one in-progress attempt
per (user, survey)*, enforced by the partial unique index
`attempts_one_in_progress_per_user_survey` (`WHERE completed_at IS NULL`), plus
`responses_attempt_question_unique` on `(attempt_id, question_id)`. These indexes
are load-bearing, not defensive:

- `createNewAttempt` is get-or-create and inserts first with
  `onConflictDoNothing` (repeating the index predicate in `where` so Postgres can
  infer the arbiter), then reads back the winner's row — never check-then-insert.
- `saveResponse` upserts on the response index, so concurrent saves collapse.
- The `PUT` attempt route accepts a client-supplied `attemptId` and returns **409**
  when it is no longer current (the user restarted in another tab), instead of
  resurrecting discarded answers.
- Because there is exactly one response row per question, "is the attempt
  complete?" is a row count against the question count (`POST` attempt route).

**AI summaries.** Open-ended questions can be summarised by an LLM, if the
deployment configures one. `libs/services/ai/` resolves a provider from the
environment (`config.ts`, auto-detecting anthropic → openai → ollama unless
`AI_SUMMARY_PROVIDER` pins one) and returns a `SummaryProvider` behind one
interface; `openai.ts` serves both OpenAI and Ollama, which speaks the same
`/v1/chat/completions`. Resolution is lazy, at request time — `npm run build`
must keep working with no provider credentials set. Two rules hold throughout:
a provider error is logged server-side and re-thrown as an
`InvalidOperationError` whose message is safe to show a survey owner, never
forwarded raw; and `generateSummaryForQuestion` takes an injectable `provider`
so tests exercise the whole path without reaching the network. Results persist
one row per question in `question_summaries`, upserted on
`question_summaries_question_unique` so concurrent Regenerate clicks collapse.

**Auth.** NextAuth v4 credentials provider configured in `auth.ts` (bcrypt,
JWT sessions). `auth()` is the server-side session accessor for routes;
`SessionProvider` / `useSession()` on the client. The `jwt` callback re-reads the
user from the database on `trigger === "update"` — the client never supplies
profile values itself. `session.user.id` is augmented via module declaration in
`auth.ts` and is what services key on.

**Routing note.** `/` permanently redirects to `/surveys` (`next.config.ts`).
Note the two API prefixes are distinct: `/api/survey/[surveyId]/...` covers
answering (attempts), `/api/surveys/...` covers authoring and summaries.
