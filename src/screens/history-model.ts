import { request } from "../api/http";
import type { Query, QueryList } from "../api/mizuchi.gen";

/** History filter statuses. Running queries are a different endpoint. */
export const HISTORY_STATUSES = ["completed", "failed", "cancelled"] as const;
export type HistoryStatus = (typeof HISTORY_STATUSES)[number];

export const PAGE_SIZE = 50;
export const RANGE_FETCH_LIMIT = 500;

/** URL-backed history filters. Time bounds are `datetime-local` strings. */
export type HistorySearch = {
  status?: HistoryStatus;
  q?: string;
  from?: string;
  to?: string;
  offset: number;
  limit: number;
};

export const defaultHistorySearch = (): HistorySearch => ({ offset: 0, limit: PAGE_SIZE });

const isStatus = (value: unknown): value is HistoryStatus =>
  HISTORY_STATUSES.some((status) => status === value);

const asInt = (value: unknown, fallback: number, max: number): number => {
  const n =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }
  return Math.min(Math.trunc(n), max);
};

/** Parse router search into a typed filter. Unknown keys are dropped. */
export const parseHistorySearch = (search: Record<string, unknown>): HistorySearch => {
  const q = typeof search.q === "string" ? search.q.trim() : "";
  const from = typeof search.from === "string" ? search.from : "";
  const to = typeof search.to === "string" ? search.to : "";
  return {
    ...(isStatus(search.status) ? { status: search.status } : {}),
    ...(q ? { q } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    offset: asInt(search.offset, 0, 1_000_000),
    limit: asInt(search.limit, PAGE_SIZE, RANGE_FETCH_LIMIT) || PAGE_SIZE,
  };
};

/** `datetime-local` or ISO string → microseconds since epoch. */
export const parseTimeInput = (value: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms * 1000;
};

const hasRange = (search: HistorySearch): boolean => Boolean(search.from || search.to);

/** API path for status/text/pagination. Time range is not a server parameter. */
export const historyPath = (
  search: HistorySearch,
  page: { offset: number; limit: number } = { offset: search.offset, limit: search.limit },
): string => {
  const params = new URLSearchParams();
  if (search.status) {
    params.set("status", search.status);
  }
  if (search.q) {
    params.set("q", search.q);
  }
  params.set("offset", String(page.offset));
  params.set("limit", String(page.limit));
  return `v1/queries?${params}`;
};

/**
 * Apply a started-at time range and paginate. The API has no time query params,
 * so a ranged request fetches one max page and slices it here.
 */
export const paginateHistory = (list: QueryList, search: HistorySearch): QueryList => {
  if (!hasRange(search)) {
    return list;
  }
  const fromUs = parseTimeInput(search.from ?? "");
  const toUs = parseTimeInput(search.to ?? "");
  const queries = list.queries.filter((query) => {
    if (fromUs !== undefined && query.started_at_us < fromUs) {
      return false;
    }
    if (toUs !== undefined && query.started_at_us > toUs) {
      return false;
    }
    return true;
  });
  const total = queries.length;
  const page = queries.slice(search.offset, search.offset + search.limit);
  return { queries: page, total, offset: search.offset, limit: search.limit };
};

export const pageRange = (list: QueryList): { start: number; end: number } => ({
  start: list.total === 0 ? 0 : list.offset + 1,
  end: list.offset + list.queries.length,
});

export const hasPrevPage = (list: QueryList): boolean => list.offset > 0;
export const hasNextPage = (list: QueryList): boolean =>
  list.offset + list.queries.length < list.total;
export const prevOffset = (search: HistorySearch): number =>
  Math.max(0, search.offset - search.limit);
export const nextOffset = (search: HistorySearch): number => search.offset + search.limit;

export const formatDuration = (ns: number): string => {
  if (ns < 1_000) {
    return `${ns} ns`;
  }
  if (ns < 1_000_000) {
    return `${Math.round(ns / 1_000)} µs`;
  }
  if (ns < 1_000_000_000) {
    return `${(ns / 1_000_000).toFixed(ns < 10_000_000 ? 2 : 0)} ms`;
  }
  return `${(ns / 1_000_000_000).toFixed(2)} s`;
};

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  }
  return `${(bytes / 1024 ** 3).toFixed(1)} GiB`;
};

export const formatTime = (us: number | null): string => {
  if (us === null) {
    return "—";
  }
  return new Date(us / 1000).toISOString().replace("T", " ").replace("Z", " UTC");
};

export const truncateSql = (sql: string, max = 80): string => {
  const line = sql.trim().replaceAll(/\s+/g, " ");
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

export type StatusTone = "ok" | "bad" | "warning" | "muted";

export const statusTone = (status: Query["status"]): StatusTone => {
  switch (status) {
    case "completed":
      return "ok";
    case "failed":
      return "bad";
    case "cancelled":
      return "warning";
    case "running":
      return "muted";
    default:
      return "muted";
  }
};

/** Completed-query page from `GET /v1/queries`. */
export const fetchQueryList = async (
  search: HistorySearch,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<QueryList> => {
  const init = token ? { token } : {};
  if (!hasRange(search)) {
    return request<QueryList>(historyPath(search), init, fetcher);
  }
  const queries: Query[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    const page = await request<QueryList>(
      historyPath(search, { offset, limit: RANGE_FETCH_LIMIT }),
      init,
      fetcher,
    );
    queries.push(...page.queries);
    total = page.total;
    if (page.queries.length === 0) {
      break;
    }
    offset += page.queries.length;
  }
  return paginateHistory(
    { queries, total: queries.length, offset: 0, limit: search.limit },
    search,
  );
};

/** One query, including plan and metrics when the server stored them. */
export const fetchQuery = (
  id: string,
  token: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<Query> =>
  request<Query>(`v1/queries/${encodeURIComponent(id)}`, token ? { token } : {}, fetcher);
