// Generated from Sannrox/mizuchi api/mizuchi-http-v1.schema.json at draft (contract mizuchi-http-v1-draft).
// Do not edit: run `pnpm api:gen`.

export interface MizuchiHttpV1 {
Health?: Health
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "Health".
 */
export interface Health {
contracts: string[]
version: string
}

export const MIZUCHI_CONTRACT = "mizuchi-http-v1-draft";
