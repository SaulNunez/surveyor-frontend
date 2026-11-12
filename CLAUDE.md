# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (turbopack) on :3000
npm run build        # production build (needs DATABASE_URL and NEXTAUTH_SECRET set)
npm run lint         # eslint (next/core-web-vitals)
npm run typecheck    # tsc --noEmit
npm test             # vitest run — REQUIRES a live Postgres
npm run test:watch
npm run db:generate  # drizzle-kit generate: emit a migration from libs/db/schema.ts
npm run db:migrate   # drizzle-kit migrate: apply migrations in drizzle/
npm run i18n:extract # lingui extract --clean: refresh locales/*.po from the source
```

Run a single test file / single test:

```bash
npx vitest run test/attemptService.test.ts
npx vitest run test/attemptService.test.ts -t 'should manage attempts'
```

CI (`.github/workflows/test.yml`) runs lint → typecheck → build → test against a
`postgres:15` service, so all four must pass locally before pushing.

## Environment

Copy `.env.example` to `.env`. `DATABASE_URL` is required by the app, by
drizzle-kit, and by the test suite. `docker-compose up` brings up the app plus a
Postgres 15 volume; the `Dockerfile` builds the Next.js `output: "standalone"`
bundle.

The app applies pending migrations itself on startup: `instrumentation.ts` calls
`runMigrations()` (`libs/db/migrate.ts`, drizzle's runtime migrator under a
Postgres advisory lock) before the server takes requests, in both `next dev` and
the standalone image (which copies `drizzle/` in). `npm run db:migrate` still
works for applying them by hand.

## Testing model

Tests are **integration tests against a real database**, not unit tests with mocks:

- `test/globalSetup.ts` drops and recreates the whole schema in raw SQL. It is a
  hand-maintained mirror of `libs/db/schema.ts` — **any schema change must be
  applied there too**, alongside a drizzle migration, or tests silently run
  against a stale schema.
- `test/setup.ts` `TRUNCATE`s every table before each test.
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
   `NotFoundError` / `InvalidOperationError` (`libs/models/Errors/`), each
   naming an outcome with an `ErrorCode` rather than a sentence; routes map
   those onto status codes and onto a message in the caller's language.
   Ownership checks live here and deliberately throw
   `NotFoundError` (not a 403) when a row belongs to another user, so the API
   does not leak existence.
3. `app/api/**/route.ts` — thin: `auth()` for the session, parse/validate the
   body, call services, turn errors into statuses and sentences. Client pages under `app/` are
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

## Internationalization

Lingui v5, with the SWC macro plugin (`experimental.swcPlugins` in
`next.config.ts`) and `@lingui/loader` compiling the `.po` catalogs through the
Turbopack rule beside it. Both are load-bearing: without the plugin the macros
reach the bundle untransformed and throw at render time, and without the loader
rule a `.po` import is not a message map. The pinned `@lingui/swc-plugin@5.6.1`
is the build matching Next 15.5's `swc_core`; a Lingui or Next upgrade has to
re-check that pairing against the plugin's compatibility table.

**Locale, not routes.** The active locale lives in a `locale` cookie, so every
URL — the public survey links included — is unchanged by language. A request
with no cookie negotiates `Accept-Language` instead (`negotiateLocale` in
`libs/i18n/locales.ts`, which matches `es-MX` onto `es`), and an unknown cookie
value is ignored rather than trusted. `LOCALES` in that file is the single
source of truth: `lingui.config.ts` imports it, and adding a locale means adding
it there, adding its catalog import to `libs/i18n/server.ts`, then running
`npm run i18n:extract` and translating the new `locales/<locale>.po`.

**Server and client are fed separately.** `initLingui()` (`libs/i18n/server.ts`)
puts the request's catalog in a request-scoped store, and Lingui's server-side
`Trans` reads it *synchronously* — so **every layout and page that renders a
translated Server Component must await `initLingui()` before rendering**, which
today means `app/layout.tsx`, `app/settings/page.tsx` and `app/surveys/page.tsx`.
An `I18n` object cannot be serialised across the boundary, so the root layout
passes the locale and its messages to `LinguiClientProvider`, which builds an
equivalent instance for the browser; the provider re-activates it when those
props change, which is what makes the switcher take effect without a reload.
Because reading the cookie makes the root layout dynamic, no page is statically
rendered — which this app, being auth- and database-backed throughout, was not
doing anyway.

**Writing messages.** `Trans` / `useLingui` come from `@lingui/react/macro` and
work in both Server and Client Components. Inside a component, use the `t` from
`useLingui()` rather than a bare `t` or `plural` import: those compile against
Lingui's *global* instance, which this app never activates, so they would render
untranslated. A module with no component context (`OpenEndedSummaryCard`'s fetch
helper, `app/settings/actions.ts`) takes the resolved string as a parameter from
its caller instead. `QUESTION_TYPE_LABELS` (`libs/i18n/questionTypes.ts`) holds
the reader-facing name of each question variant as a message descriptor — it is
one more switch over the `questionType` discriminant that a new question type
has to touch.

**Errors from the API.** A route's own refusals (`Unauthorized`, the guest
guards, the 400s) use `translate(msg`…`)` from `libs/i18n/apiErrors.ts`, which
resolves against the request's cookie exactly as a page does. Errors a *service*
threw go through `errorMessage(reason)` instead, and this is why services carry
codes: `libs/services/` is what the vitest suite imports directly, and the macro
transform only runs inside the Next build, so a `msg` in a service would throw
the moment a test touched it. `ERROR_MESSAGES` (`libs/models/Errors/errorCodes.ts`)
therefore holds the English for `Error.message` — logs, stack traces, the tests
that assert on it — while `ERROR_DESCRIPTORS` in `apiErrors.ts` holds the
sentence the reader gets. `Record<ErrorCode, MessageDescriptor>` is what keeps
the two lists in step: a new code will not compile without a message. Values for
a message's `{placeholder}`s ride on the error and are folded into the descriptor,
since Lingui reads them from there rather than from a second argument.

Anything thrown that carries no code is a fault in the server rather than
something the reader did. Those used to be forwarded verbatim — driver text, SQL,
whatever `Error.message` held. They are now logged in full and answered with one
translatable sentence, which is both the only way to say them in Spanish and the
end of a small information leak.

Survey content — titles, descriptions, options, labels — is the author's own
text and is never translated; only the chrome around it is. The English defaults
an author leaves blank (`Yes`, `No`, `Strongly Agree`) are shown to the
respondent, so those *are* translated, into the respondent's locale.
