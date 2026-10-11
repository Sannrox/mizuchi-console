import { useQuery } from "@tanstack/react-query";
import { createRootRoute, createRouter } from "@tanstack/react-router";
import { checkServer, consoleRoot } from "./api/http";

/** Gate every screen on a reachable, compatible mizuchi server. */
const Root = () => {
  const server = useQuery({
    queryKey: ["server"],
    queryFn: () => checkServer(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  if (!server.data) {
    return <p>{server.error ? `Could not load: ${server.error.message}` : "Connecting"}</p>;
  }
  if (server.data.kind !== "ready") {
    return <p>mizuchi {server.data.version} is too old for this console.</p>;
  }
  return (
    <main>
      <h1>mizuchi</h1>
      <p>Connected to mizuchi {server.data.version}.</p>
    </main>
  );
};

export const router = createRouter({
  routeTree: createRootRoute({ component: Root }),
  basepath: consoleRoot.pathname,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
