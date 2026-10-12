import { ApiError, request } from "../api/http";
import type { CancelResult, RunningList } from "../api/mizuchi.gen";

export const RUNNING_PATH = "v1/queries/running";
export const POLL_MS = 2_000;

export const cancelPath = (id: string): string => `v1/queries/${encodeURIComponent(id)}/cancel`;

/** Live queries from `GET /v1/queries/running`. */
export const fetchRunningList = (
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<RunningList> => request<RunningList>(RUNNING_PATH, token ? { token } : {}, fetcher);

/** One cancel POST. The client never retries this. */
export const cancelQuery = (
  id: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<CancelResult> =>
  request<CancelResult>(cancelPath(id), { token, method: "POST" }, fetcher);

export type CancelNotice = { tone: "ok" | "bad" | "unknown"; text: string };

/** Cancel returns when the stop was requested, not when the query has left the list. */
export const cancelOutcome = (result: CancelResult): CancelNotice =>
  result.cancelled
    ? { tone: "ok", text: "Cancellation requested" }
    : { tone: "unknown", text: "Server did not cancel the query" };

export const cancelFailure = (error: unknown): CancelNotice =>
  error instanceof ApiError
    ? { tone: "bad", text: error.message }
    : {
        tone: "unknown",
        text: "No answer from the server; the query may still be running.",
      };
