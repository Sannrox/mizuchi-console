# mizuchi-console

Web console for the [mizuchi](https://github.com/Sannrox/mizuchi) query engine:
query history, plans with EXPLAIN ANALYZE, operator metrics and memory, and live
running queries with cancel. It is a client of mizuchi's versioned HTTP API only
(see [ADR 0002](docs/decisions/0002-separate-console-api-only.md)); mizuchi itself
ships no UI code.

The console vendors mizuchi's `mizuchi.query-api/v1` contract. It lists history,
plans with ANALYZE overlay, operator metrics, and a polled running list with
cancel.

## How it ships

Each tag `vX.Y.Z` publishes `mizuchi-console-vX.Y.Z.zip`, `SHA256SUMS`, and a GitHub
artifact attestation. mizuchi serves an unpacked zip from `QueryApiConfig.ui_dir` at
`/ui/` (ADR 0014). The build uses only relative URLs and loads no assets from other
origins, so the same zip works at `/ui/` and behind a proxy prefix.

## API types

`api/mizuchi-http-v1.schema.json` is mizuchi's published query-api schema, vendored at
the commit in `api/MIZUCHI_REF`. `src/api/mizuchi.gen.ts` is generated from it.

```sh
pnpm api:sync <mizuchi-commit-sha>   # update the vendored schema and regenerate
pnpm api:check                       # CI: fail when generated types are stale
```

At startup the console requires `/healthz` to list the contract it was built for and
shows "too old" otherwise.

## Develop

```sh
pnpm install
MIZUCHI_URL=http://127.0.0.1:8080 pnpm dev   # proxies /v1 and /healthz to a mizuchi server
pnpm api:check && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
VERSION=v0.0.0-dev pnpm package              # release/ zip + SHA256SUMS
```

Stack: TypeScript (strict), React, Vite, TanStack Query and Router, Tailwind,
Oxlint (type-aware) and Oxfmt, Vitest, pnpm. License: Apache-2.0.
