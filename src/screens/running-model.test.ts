import { describe, expect, it } from "vitest";
import { ApiError } from "../api/http";
import type { CancelResult, RunningList } from "../api/mizuchi.gen";
import {
  RUNNING_PATH,
  cancelFailure,
  cancelOutcome,
  cancelPath,
  cancelQuery,
  fetchRunningList,
} from "./running-model";

const hrefOf = (url: URL | RequestInfo): string =>
  url instanceof URL ? url.href : typeof url === "string" ? url : url.url;

const recorded: RunningList = {
  queries: [
    {
      id: "q-1",
      sql: "select * from events",
      status: "running",
      started_at_us: 1_700_000_000_000_000,
      elapsed_ns: 1_500_000_000,
      stage: "execute",
    },
    {
      id: "q-2",
      sql: "insert into t select 1",
      status: "running",
      started_at_us: 1_700_000_001_000_000,
      elapsed_ns: 250_000_000,
      stage: "scan",
    },
  ],
};

const cancelled: CancelResult = { id: "q-1", cancelled: true };

describe("fetchRunningList", () => {
  it("loads the recorded running list with the bearer token", async () => {
    let path = "";
    let auth: string | null = null;
    const list = await fetchRunningList("t-1", (url, init) => {
      path = hrefOf(url);
      auth = new Headers(init?.headers).get("authorization");
      return Promise.resolve(new Response(JSON.stringify(recorded)));
    });
    expect(path).toContain(RUNNING_PATH);
    expect(auth).toBe("Bearer t-1");
    expect(list.queries.map((row) => row.id)).toStrictEqual(["q-1", "q-2"]);
    expect(list.queries[0]?.stage).toBe("execute");
  });

  it("omits authorization when no token is present", async () => {
    let auth: string | null | undefined;
    await fetchRunningList(undefined, (url, init) => {
      auth = new Headers(init?.headers).get("authorization");
      return Promise.resolve(new Response(JSON.stringify({ queries: [] })));
    });
    expect(auth).toBeNull();
  });
});

describe("cancelQuery", () => {
  it("posts cancel once to the recorded id", async () => {
    let path = "";
    let method: string | undefined;
    let auth: string | null = null;
    const result = await cancelQuery("q-1", "t-1", (url, init) => {
      path = hrefOf(url);
      method = init?.method;
      auth = new Headers(init?.headers).get("authorization");
      return Promise.resolve(new Response(JSON.stringify(cancelled)));
    });
    expect(path).toContain(cancelPath("q-1"));
    expect(method).toBe("POST");
    expect(auth).toBe("Bearer t-1");
    expect(result).toStrictEqual(cancelled);
  });

  it("encodes the query id in the cancel path", () => {
    expect(cancelPath("q/1")).toBe("v1/queries/q%2F1/cancel");
  });
});

describe("cancelOutcome", () => {
  it("treats cancelled:true as a requested stop, not a finished query", () => {
    expect(cancelOutcome(cancelled)).toStrictEqual({
      tone: "ok",
      text: "Cancellation requested",
    });
  });

  it("does not call a false cancel a success", () => {
    expect(cancelOutcome({ id: "q-1", cancelled: false })).toStrictEqual({
      tone: "unknown",
      text: "Server did not cancel the query",
    });
  });
});

describe("cancelFailure", () => {
  it("surfaces the server error text and leaves other failures unknown", () => {
    expect(cancelFailure(new ApiError(409, "not running"))).toStrictEqual({
      tone: "bad",
      text: "not running",
    });
    expect(cancelFailure(new Error("network"))).toStrictEqual({
      tone: "unknown",
      text: "No answer from the server; the query may still be running.",
    });
  });
});
