import { describe, expect, it } from "vitest";
import type { Query, QueryList } from "../api/mizuchi.gen";
import {
  PAGE_SIZE,
  RANGE_FETCH_LIMIT,
  fetchQuery,
  fetchQueryList,
  formatBytes,
  formatDuration,
  formatTime,
  hasNextPage,
  hasPrevPage,
  historyPath,
  nextOffset,
  pageRange,
  paginateHistory,
  parseHistorySearch,
  prevOffset,
  statusTone,
  truncateSql,
} from "./history-model";

const query = (over: Partial<Query> & Pick<Query, "id" | "started_at_us">): Query => ({
  sql: "select 1",
  status: "completed",
  ended_at_us: over.started_at_us + 1_000_000,
  duration_ns: 1_000_000_000,
  rows: 1,
  peak_bytes: 4096,
  spilled_bytes: 0,
  error: null,
  ...over,
});

const recorded: QueryList = {
  total: 3,
  offset: 0,
  limit: 50,
  queries: [
    query({ id: "q-late", sql: "select late", started_at_us: 1_700_000_002_000_000 }),
    query({
      id: "q-fail",
      sql: "select fail",
      status: "failed",
      started_at_us: 1_700_000_001_000_000,
      error: "boom",
    }),
    query({ id: "q-early", sql: "select early", started_at_us: 1_700_000_000_000_000 }),
  ],
};

describe("parseHistorySearch", () => {
  it("keeps known filters and drops the rest", () => {
    expect(
      parseHistorySearch({
        status: "failed",
        q: " join ",
        from: "2024-01-01T00:00",
        offset: "50",
        limit: "10",
        extra: "x",
      }),
    ).toStrictEqual({
      status: "failed",
      q: "join",
      from: "2024-01-01T00:00",
      offset: 50,
      limit: 10,
    });
  });

  it("defaults offset and limit", () => {
    expect(parseHistorySearch({})).toStrictEqual({ offset: 0, limit: PAGE_SIZE });
  });
});

describe("historyPath", () => {
  it("sends status, search, and server pagination", () => {
    expect(historyPath({ status: "failed", q: "join", offset: 50, limit: 10 })).toBe(
      "v1/queries?status=failed&q=join&offset=50&limit=10",
    );
  });

  it("can override offset and limit for a walk of the history API", () => {
    expect(
      historyPath(
        { from: "2024-01-01T00:00", offset: 50, limit: 10 },
        { offset: 0, limit: RANGE_FETCH_LIMIT },
      ),
    ).toBe(`v1/queries?offset=0&limit=${RANGE_FETCH_LIMIT}`);
  });
});

describe("paginateHistory", () => {
  it("leaves an unfiltered server page alone", () => {
    expect(paginateHistory(recorded, { offset: 0, limit: 50 })).toStrictEqual(recorded);
  });

  it("filters by started_at and paginates locally", () => {
    const page = paginateHistory(recorded, {
      from: "2023-11-14T22:13:21.000Z",
      to: "2023-11-14T22:13:21.000Z",
      offset: 0,
      limit: 1,
    });
    expect(page.queries.map((row) => row.id)).toStrictEqual(["q-fail"]);
    expect(page.total).toBe(1);
    expect(page.offset).toBe(0);
    expect(page.limit).toBe(1);
  });
});

describe("page helpers", () => {
  it("names the visible range and neighbouring offsets", () => {
    const page = { ...recorded, offset: 50, limit: 50, total: 120, queries: recorded.queries };
    expect(pageRange(page)).toStrictEqual({ start: 51, end: 53 });
    expect(hasPrevPage(page)).toBe(true);
    expect(hasNextPage(page)).toBe(true);
    expect(prevOffset({ offset: 50, limit: 50 })).toBe(0);
    expect(nextOffset({ offset: 50, limit: 50 })).toBe(100);
  });
});

describe("formatters", () => {
  it("renders duration, bytes, time, sql, and status tone", () => {
    expect(formatDuration(500)).toBe("500 ns");
    expect(formatDuration(12_000)).toBe("12 µs");
    expect(formatDuration(2_500_000)).toBe("2.50 ms");
    expect(formatDuration(1_500_000_000)).toBe("1.50 s");
    expect(formatBytes(100)).toBe("100 B");
    expect(formatBytes(2048)).toBe("2.0 KiB");
    expect(formatTime(null)).toBe("—");
    expect(formatTime(1_700_000_000_000_000)).toBe("2023-11-14 22:13:20.000 UTC");
    expect(truncateSql("  select   1  from   t  ", 14)).toBe("select 1 from…");
    expect(statusTone("failed")).toBe("bad");
  });
});

describe("fetchQueryList", () => {
  it("requests the history path with the bearer token", async () => {
    let path = "";
    let auth: string | null = null;
    const list = await fetchQueryList(
      { status: "completed", offset: 0, limit: 50 },
      "t-1",
      (url, init) => {
        path = url instanceof URL ? url.href : typeof url === "string" ? url : url.url;
        auth = new Headers(init?.headers).get("authorization");
        return Promise.resolve(new Response(JSON.stringify(recorded)));
      },
    );
    expect(path).toContain("v1/queries?status=completed&offset=0&limit=50");
    expect(auth).toBe("Bearer t-1");
    expect(list.total).toBe(3);
  });

  it("walks every history page before applying a time range", async () => {
    const seen: string[] = [];
    const first = query({ id: "q-old", started_at_us: 1_600_000_000_000_000 });
    const second = query({ id: "q-in", started_at_us: 1_700_000_001_000_000 });
    const list = await fetchQueryList(
      { from: "2023-11-14T22:13:21.000Z", to: "2023-11-14T22:13:21.000Z", offset: 0, limit: 50 },
      undefined,
      (url) => {
        const href = url instanceof URL ? url.href : typeof url === "string" ? url : url.url;
        seen.push(href);
        if (href.includes("offset=0&")) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ queries: [first], total: 2, offset: 0, limit: RANGE_FETCH_LIMIT }),
            ),
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({ queries: [second], total: 2, offset: 1, limit: RANGE_FETCH_LIMIT }),
          ),
        );
      },
    );
    expect(seen).toHaveLength(2);
    expect(seen[0]).toContain(`offset=0&limit=${RANGE_FETCH_LIMIT}`);
    expect(seen[1]).toContain(`offset=1&limit=${RANGE_FETCH_LIMIT}`);
    expect(list.queries.map((row) => row.id)).toStrictEqual(["q-in"]);
    expect(list.total).toBe(1);
  });
});

describe("fetchQuery", () => {
  it("loads one recorded query by id", async () => {
    const recordedQuery = query({
      id: "q-late",
      sql: "select late",
      started_at_us: 1_700_000_002_000_000,
    });
    const row = await fetchQuery("q-late", undefined, (url) => {
      const href = url instanceof URL ? url.href : typeof url === "string" ? url : url.url;
      expect(href).toContain("v1/queries/q-late");
      return Promise.resolve(new Response(JSON.stringify(recordedQuery)));
    });
    expect(row.id).toBe("q-late");
  });
});
