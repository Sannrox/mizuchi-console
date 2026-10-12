import { describe, expect, it } from "vitest";
import { ApiError, checkServer, locate, request } from "./http";
import { MIZUCHI_CONTRACT } from "./mizuchi.gen";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("locate", () => {
  it("puts the API two levels above the entry module in production", () => {
    const { apiRoot, consoleRoot } = locate("https://host/p/ui/assets/main.js", false);
    expect(apiRoot.href).toBe("https://host/p/");
    expect(consoleRoot.href).toBe("https://host/p/ui/");
  });

  it("uses the dev server origin in development", () => {
    expect(locate("http://localhost:5173/src/main.tsx", true).consoleRoot.href).toBe(
      "http://localhost:5173/",
    );
  });
});

describe("request", () => {
  it("sends the bearer token and surfaces the server error text", async () => {
    let auth: string | null = null;
    const error = await request("v1/queries", { token: "t-1" }, (_, init) => {
      auth = new Headers(init?.headers).get("authorization");
      return json({ error: "unauthorized" }, 401);
    }).catch((caught: unknown) => caught);
    expect(auth).toBe("Bearer t-1");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: "unauthorized" });
  });
});

describe("checkServer", () => {
  it("is ready when the server lists our contract", async () => {
    const check = await checkServer(() =>
      json({ ok: true, contract: MIZUCHI_CONTRACT, version: "0.1.0" }),
    );
    expect(check).toStrictEqual({ kind: "ready", version: "0.1.0" });
  });

  it("reports an older server", async () => {
    const check = await checkServer(() =>
      json({ ok: true, contract: "mizuchi.query-api/v0", version: "0.0.1" }),
    );
    expect(check).toStrictEqual({ kind: "too-old", version: "0.0.1" });
  });

  it("treats the draft health shape as too old", async () => {
    const check = await checkServer(() => json({ contracts: [], version: "0.0.1" }));
    expect(check.kind).toBe("too-old");
  });
});
