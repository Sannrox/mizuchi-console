import { MIZUCHI_CONTRACT } from "./mizuchi.gen";
import type { Health } from "./mizuchi.gen";

/**
 * Where this console and its API live.
 *
 * Production bundles sit at `<base>/ui/assets/*.js`: the console root is one
 * level above the entry module and the API root two. The dev server serves both
 * from its origin.
 */
export const locate = (moduleUrl: string, dev: boolean) =>
  dev
    ? { consoleRoot: new URL("/", moduleUrl), apiRoot: new URL("/", moduleUrl) }
    : { consoleRoot: new URL("../", moduleUrl), apiRoot: new URL("../../", moduleUrl) };

export const { consoleRoot, apiRoot } = locate(import.meta.url, import.meta.env.DEV);

/** A non-2xx response; `message` is the server's `error` text when present. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type ApiRequest = {
  token?: string;
  method?: "GET" | "POST";
};

/** Typed JSON request against the mizuchi API. */
export const request = async <T>(
  path: string,
  init: ApiRequest = {},
  fetcher: typeof fetch = fetch,
): Promise<T> => {
  const headers = new Headers({ accept: "application/json" });
  if (init.token) {
    headers.set("authorization", `Bearer ${init.token}`);
  }
  const response = await fetcher(new URL(path, apiRoot), {
    method: init.method ?? "GET",
    headers,
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message =
      typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
        ? body.error
        : `HTTP ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
};

export type ServerCheck = { kind: "ready"; version: string } | { kind: "too-old"; version: string };

/** Require the server to list the contract this console was built for. */
export const checkServer = async (fetcher: typeof fetch = fetch): Promise<ServerCheck> => {
  const health = await request<Health>("healthz", {}, fetcher);
  return health.ok && health.contract === MIZUCHI_CONTRACT
    ? { kind: "ready", version: health.version }
    : { kind: "too-old", version: health.version };
};
