---
name: onboard-uploady-project
description: Load and maintain the Uploady monorepo's Codex context. Use at the start of every new Codex session or delegated Codex agent task in the Uploady repository, before planning, reviewing, debugging, or changing backend, frontend, database, storage, Docker, tooling, or tests. Also use after project changes to synchronize the agent-oriented app READMEs with current behavior.
---

# Onboard Uploady Project

## Overview

Load the maintained backend and frontend handoff documents before working, then
keep them synchronized with every material project change.

## Start every new session

1. Read `apps/api/README.md` completely.
2. Read `apps/web/README.md` completely.
3. Run `git status --short` before editing. Preserve existing user changes.
4. Inspect source files relevant to the request. Treat code and committed
   configuration as authoritative if either README has become stale.
5. Identify the documented architecture boundaries, invariants, unfinished
   work, and verification commands that apply to the task before acting.

Do not reconstruct the project solely from filenames or prior chat context. Use
the two READMEs as the initial map, then verify task-specific details in source.

## Preserve project invariants

- Keep mutable file and folder names out of S3/R2 object keys.
- Scope persisted user data by the current user; authentication is not yet
  implemented and services currently use a documented temporary user.
- Keep persistence inside repository modules and multi-table state changes
  transactional.
- Preserve the typed Elysia `App` to Eden Treaty connection between API and web.
- Do not edit `apps/web/src/routeTree.gen.ts` manually.
- Do not describe prepared contracts as implemented behavior. Multipart upload,
  nested file upload, download, file mutations, and authentication remain gaps
  until their code and verification exist.

Use the README invariant sections for the complete current list.

## Follow established architecture and framework best practices

Inspect neighboring implementations before adding code. Follow the architecture
already established in this repository unless the task explicitly requires a
redesign and the user approves it.

For the Bun/Elysia API:

- Compose typed Elysia route plugins under the existing `/api/v1` application.
- Define schemas for untrusted request data with Elysia `t`. Keep response
  contracts TypeScript/DTO-first and let typed handler returns flow into the
  exported `App` contract for Eden Treaty; add response schemas only for a
  documented runtime output-validation or serialization requirement.
- Keep HTTP parsing and status mapping in `routes/`, business rules and state
  transitions in `services/`, and database access in `repositories/`.
- Use Drizzle transactions for related multi-table writes and preserve user
  ownership checks at persistence/read boundaries.
- Follow current official Elysia guidance for the installed version when adding
  plugins, lifecycle hooks, validation, errors, or Eden-visible contracts.

For the React/TanStack Router web app:

- Use file-based routes, route loaders, pending/error/not-found components,
  `Link`/`useNavigate`, abort signals, and router invalidation consistently with
  existing routes.
- Load route data in TanStack Router loaders rather than duplicating it in
  component effects. Keep backend calls typed through Eden Treaty.
- Never edit `routeTree.gen.ts`; let the TanStack Router plugin generate it.
- Follow current official TanStack Router guidance for the installed version
  when changing loaders, navigation, caching, invalidation, or route context.

Before creating a new implementation, use `rg` to find existing schemas,
constants, types, utilities, hooks, components, and request patterns. Reuse or
extend the existing source of truth. Do not repeat API calls, validation logic,
status mapping, formatting, or UI state machines in multiple files.

When logic or presentation is genuinely shared, extract it into a focused file
in the existing layer (`lib/`, `utils/`, `components/`, `hooks/`, `services/`,
or `repositories/`) and import it from callers. Keep each file responsible for
one coherent concern. Avoid both copy/paste duplication and speculative wrapper
abstractions that have only one use and hide straightforward behavior.

## Update handoff documentation with every project change

Update the relevant README in the same change whenever modifying code, schema,
migrations, APIs, UI behavior, configuration, environment variables, commands,
deployment, tests, directory responsibilities, invariants, or known gaps:

- Update `apps/api/README.md` for backend, database, storage, Docker/API
  deployment, or backend-test changes.
- Update `apps/web/README.md` for frontend routes, loaders, components, client
  behavior, styling architecture, or frontend-tooling changes.
- Update both for end-to-end contracts, shared workflows, or changes affecting
  the API/web boundary.

Keep the READMEs written for future agents, not as marketing or beginner
tutorials. Record:

- what is implemented now;
- where the implementation lives;
- important request, state, and data flows;
- constraints and non-obvious design decisions;
- validation coverage and what remains mocked or unverified;
- unfinished work, removing items when they become complete.

Never document intended future behavior as current behavior. If a change is
purely documentation or formatting and does not alter project knowledge, do not
make a meaningless recursive README edit.

## Finish a task

1. Re-read the affected README sections against the final diff.
2. Update stale directory maps, endpoint/route tables, workflows, commands,
   tests, known gaps, and invariants.
3. Run the task-relevant checks documented by the app README.
4. Run Prettier on changed README files and `git diff --check`.
5. Report which README was updated and why. If no README change was necessary,
   explicitly justify why the project knowledge did not change.
