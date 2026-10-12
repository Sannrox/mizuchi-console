import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSession } from "../auth/session";
import { Card, Notice } from "../ui/kit";
import {
  defaultHistorySearch,
  fetchQuery,
  formatBytes,
  formatDuration,
  formatTime,
  statusTone,
} from "./history-model";

const toneClass = {
  ok: "text-ok",
  bad: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

const row =
  "grid grid-cols-[8rem_1fr] gap-2 border-b border-line px-3.5 py-2 text-xs last:border-b-0";

/** Identity and timings for one query. Plan overlay is a later screen. */
export const QueryDetail = ({ queryId }: { queryId: string }) => {
  const token = useSession((state) => state.token);
  const query = useQuery({
    queryKey: ["query", queryId, token],
    queryFn: () => fetchQuery(queryId, token),
    retry: false,
  });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-lg font-semibold">Query</h1>
        <Link to="/" search={defaultHistorySearch()} className="text-xs text-muted">
          History
        </Link>
      </div>
      {query.error ? (
        <Notice tone="bad">{query.error.message}</Notice>
      ) : query.isPending || !query.data ? (
        <p className="text-xs text-muted">Loading</p>
      ) : (
        <Card>
          <div className={row}>
            <span className="text-muted">Status</span>
            <span className={toneClass[statusTone(query.data.status)]}>{query.data.status}</span>
          </div>
          <div className={row}>
            <span className="text-muted">SQL</span>
            <pre className="m-0 overflow-x-auto font-mono whitespace-pre-wrap">
              {query.data.sql}
            </pre>
          </div>
          <div className={row}>
            <span className="text-muted">Started</span>
            <span>{formatTime(query.data.started_at_us)}</span>
          </div>
          <div className={row}>
            <span className="text-muted">Ended</span>
            <span>{formatTime(query.data.ended_at_us)}</span>
          </div>
          <div className={row}>
            <span className="text-muted">Duration</span>
            <span>{formatDuration(query.data.duration_ns)}</span>
          </div>
          <div className={row}>
            <span className="text-muted">Rows</span>
            <span>{query.data.rows}</span>
          </div>
          <div className={row}>
            <span className="text-muted">Peak memory</span>
            <span>{formatBytes(query.data.peak_bytes)}</span>
          </div>
          {query.data.error ? (
            <div className={row}>
              <span className="text-muted">Error</span>
              <span className="text-danger">{query.data.error}</span>
            </div>
          ) : null}
        </Card>
      )}
    </>
  );
};
