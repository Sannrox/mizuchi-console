import { useQuery } from "@tanstack/react-query";
import { Outlet, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { checkServer, consoleRoot } from "./api/http";
import { History } from "./screens/history";
import { parseHistorySearch } from "./screens/history-model";
import { QueryDetail } from "./screens/query-detail";
import { Running } from "./screens/running";
import { ServerStatus } from "./screens/server-status";
import { TopBar } from "./screens/top-bar";
import { Centered, Title } from "./ui/kit";

const useServer = () =>
  useQuery({
    queryKey: ["server"],
    queryFn: () => checkServer(),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

/** Gate every screen on a reachable, compatible mizuchi server. */
const Root = () => {
  const server = useServer();
  if (!server.data) {
    return (
      <Centered>
        <Title subtitle={server.error ? `Could not load: ${server.error.message}` : "Connecting"} />
      </Centered>
    );
  }
  if (server.data.kind !== "ready") {
    return <ServerStatus check={server.data} />;
  }
  return <Outlet />;
};

const rootRoute = createRootRoute({ component: Root });

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: function App() {
    return (
      <div className="min-h-screen bg-surface">
        <TopBar />
        <main className="px-6 py-5">
          <Outlet />
        </main>
      </div>
    );
  },
});

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>) => parseHistorySearch(search),
  component: function HistoryPage() {
    return <History search={indexRoute.useSearch()} />;
  },
});

const queryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/queries/$queryId",
  component: function QueryPage() {
    const { queryId } = queryRoute.useParams();
    return <QueryDetail queryId={queryId} />;
  },
});

const runningRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/running",
  component: Running,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([appRoute.addChildren([indexRoute, queryRoute, runningRoute])]),
  basepath: consoleRoot.pathname,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
