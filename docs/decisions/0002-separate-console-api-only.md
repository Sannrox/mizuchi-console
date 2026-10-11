# ADR 0002: Separate console that consumes mizuchi's API only

- Status: Accepted
- Date: 2026-10-11
- Source: [Sannrox/mizuchi#75](https://github.com/Sannrox/mizuchi/issues/75)

## Context

Operators need to see query history, plans and EXPLAIN ANALYZE output, per-operator
metrics and memory, and running queries they can cancel. mizuchi is an embeddable
engine library; a web UI inside it would add a frontend toolchain, a network surface
and release coupling to every embedder. The same split already works for Tenkai and
[tenkai-console](https://github.com/Sannrox/tenkai-console).

## Decision

- The UI lives in this separate repository, `Sannrox/mizuchi-console`.
- It talks **only** to mizuchi's versioned HTTP API (history, metrics, cancellation).
  It never links engine code or reads engine state any other way.
- mizuchi contains no UI code. It exposes the API (Sannrox/mizuchi#75, building on
  Sannrox/mizuchi#66).
- Same stack and release model as tenkai-console: TypeScript, React, Vite, generated
  types from a vendored contract, reproducible zip with `SHA256SUMS` and attestation
  that a server may pin and serve at `/ui/`.

## Consequences

- Anything the console shows or does is also available to any other API client.
- A screen needing new data starts with an API change in mizuchi.
- Console and engine release independently; `/healthz` contract versions gate
  compatibility.

## Rejected alternatives

- **UI inside the mizuchi repository or crate:** couples the engine to a frontend
  toolchain and widens its attack surface.
- **Console reading engine internals directly:** bypasses the versioned contract.
