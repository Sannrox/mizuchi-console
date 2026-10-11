# Project profile for agent-kit skills

<!-- Read by the shared skills in https://github.com/Sannrox/agent-kit (consumers track main). Keep repo-specific facts here, not in the shared skills. Section headings are a contract: do not rename them. -->

## Project

- Name: mizuchi-console
- Feature means: a new screen or user-visible console behavior

## Ownership boundaries

mizuchi-console is a web client of mizuchi's versioned HTTP API only; the engine, query history, metrics and cancellation live in Sannrox/mizuchi.

Route work that needs new data or actions to Sannrox/mizuchi first (API change), then consume it here.

## Affected areas

api/screens/auth/build/release

## Shared surfaces

Issues touching the same shared surface run in sequence, never as parallel lanes:
the vendored API schema and generated types (`api/`, `src/api/mizuchi.gen.ts`), the router, and `package.json`/`pnpm-lock.yaml`.

## Impact boundaries

- the mizuchi HTTP contract version the console requires (`/healthz` contracts);
- relative-URL bundle that works under any proxy prefix and loads nothing from other origins;
- tokens kept in memory only;
- the release zip, `SHA256SUMS` and attestation consumed by servers that embed the console;

## Compatibility and failure obligations

The console must show "server too old" instead of failing when the server lacks its contract; failed or cancelled API calls must leave the UI usable and never retry mutations silently.

## Evidence map

Vitest unit tests for API helpers and view models; `pnpm api:check` for contract drift; `pnpm build` and `scripts/package.sh` for the release bundle.

## Verification matrix

| Surface                     | Required evidence                                          |
| --------------------------- | ---------------------------------------------------------- |
| API client, generated types | `pnpm api:check`, unit tests against recorded responses    |
| screens and view models     | Vitest tests for the model logic; typecheck and lint clean |
| build and release bundle    | `pnpm build`; `scripts/package.sh` rejects external hosts  |
| dependency bumps            | `pnpm-lock.yaml` diff reviewed; release notes read         |

## Release audit

- `package.json` version, lockfile consistency;
- vendored API contract ref (`api/MIZUCHI_REF`) and the minimum mizuchi version it needs;
- release zip, `SHA256SUMS` and attestation;
