// Generated from Sannrox/mizuchi crates/mizuchi/schemas/query-api-v1.json at 812be93cf950a9e4fce4b189928d4eb3db0c2bc7 (contract mizuchi.query-api/v1).
// Do not edit: run `pnpm api:gen`.

/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "QueryStatus".
 */
export type QueryStatus = ("running" | "completed" | "failed" | "cancelled")

export interface MizuchiHttpV1 {
CancelResult?: CancelResult
ErrorBody?: ErrorBody
Health?: Health
InputScan?: InputScan
OperatorMetrics?: OperatorMetrics
OutputWrite?: OutputWrite
Query?: Query
QueryList?: QueryList
QueryReport?: QueryReport
QueryStatus?: QueryStatus
RunningList?: RunningList
RunningQuery?: RunningQuery
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "CancelResult".
 */
export interface CancelResult {
id: string
cancelled: boolean
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "ErrorBody".
 */
export interface ErrorBody {
error: string
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "Health".
 */
export interface Health {
ok: boolean
contract: "mizuchi.query-api/v1"
version: string
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "InputScan".
 */
export interface InputScan {
dataset: string
path?: (string | null)
partitions: string[]
columns: string[]
mtime_ms?: (number | null)
etag?: (string | null)
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "OperatorMetrics".
 */
export interface OperatorMetrics {
name: string
rows: number
batches: number
elapsed_ns: number
exclusive_ns: number
blocking: boolean
peak_bytes: number
copied_bytes: number
spilled_bytes?: number
children: OperatorMetrics[]
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "OutputWrite".
 */
export interface OutputWrite {
path: string
partitions: string[]
mode: string
rows: number
bytes: number
commit_id: string
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "Query".
 */
export interface Query {
id: string
sql: string
status: QueryStatus
started_at_us: number
ended_at_us: (number | null)
duration_ns: number
rows: number
peak_bytes: number
spilled_bytes: number
error?: (string | null)
plan?: (string | null)
report?: (QueryReport | null)
metrics?: (OperatorMetrics | null)
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "QueryReport".
 */
export interface QueryReport {
engine_version: string
plan: string
inputs: InputScan[]
outputs: OutputWrite[]
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "QueryList".
 */
export interface QueryList {
queries: Query[]
total: number
offset: number
limit: number
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "RunningList".
 */
export interface RunningList {
queries: RunningQuery[]
}
/**
 * This interface was referenced by `MizuchiHttpV1`'s JSON-Schema
 * via the `definition` "RunningQuery".
 */
export interface RunningQuery {
id: string
sql: string
status: "running"
started_at_us: number
elapsed_ns: number
stage: string
}

export const MIZUCHI_CONTRACT = "mizuchi.query-api/v1";
