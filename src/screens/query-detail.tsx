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
import { operatorRows, type OperatorRow } from "./metrics-model";
import { planView, queryPlanText, type AnalyzedNode, type TextNode } from "./plan-model";

const toneClass = {
  ok: "text-ok",
  bad: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

const row =
  "grid grid-cols-[8rem_1fr] gap-2 border-b border-line px-3.5 py-2 text-xs last:border-b-0";

/** Identity, timings, logical/physical plan trees, and ANALYZE overlay. */
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
        <>
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
          <PlanSection plan={queryPlanText(query.data)} metrics={query.data.metrics} />
          {query.data.metrics ? <MetricsSection metrics={query.data.metrics} /> : null}
        </>
      )}
    </>
  );
};

const PlanSection = ({
  plan,
  metrics,
}: {
  plan: string | null | undefined;
  metrics: Parameters<typeof planView>[1];
}) => {
  const view = planView(plan, metrics);
  if (view.logical.length === 0 && view.physical.length === 0 && !view.analyzed) {
    return <p className="mt-4 text-xs text-muted">No plan recorded.</p>;
  }
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {view.logical.length > 0 && (
        <Card className="p-3.5">
          <h2 className="mt-0 mb-2 text-sm font-semibold">Logical plan</h2>
          <TextTree nodes={view.logical} />
        </Card>
      )}
      {(view.analyzed || view.physical.length > 0) && (
        <Card className="p-3.5">
          <h2 className="mt-0 mb-2 text-sm font-semibold">Physical plan</h2>
          {view.analyzed ? (
            <AnalyzedTree node={view.analyzed} />
          ) : (
            <TextTree nodes={view.physical} />
          )}
        </Card>
      )}
    </div>
  );
};

const TextTree = ({ nodes }: { nodes: TextNode[] }) => (
  <ul className="m-0 list-none p-0 font-mono text-xs">
    {nodes.map((node) => (
      <TextItem key={node.id} node={node} />
    ))}
  </ul>
);

const TextItem = ({ node }: { node: TextNode }) => (
  <li>
    <div>{node.label}</div>
    {node.children.length > 0 ? (
      <ul className="m-0 list-none border-l border-line p-0 pl-3">
        {node.children.map((child) => (
          <TextItem key={child.id} node={child} />
        ))}
      </ul>
    ) : null}
  </li>
);

const AnalyzedTree = ({ node }: { node: AnalyzedNode }) => (
  <ul className="m-0 list-none p-0 font-mono text-xs">
    <AnalyzedItem node={node} />
  </ul>
);

const AnalyzedItem = ({ node }: { node: AnalyzedNode }) => (
  <li>
    <div className={`rounded-md px-1.5 py-1 ${node.slowest ? "bg-selected text-warning" : ""}`}>
      <span className="font-semibold">{node.name}</span>
      <span className="ml-2 text-muted">
        rows={node.rows} batches={node.batches} {formatDuration(node.elapsedNs)}
      </span>
      {node.slowest ? <span className="ml-2">slowest</span> : null}
    </div>
    {node.children.length > 0 ? (
      <ul className="m-0 list-none border-l border-line p-0 pl-3">
        {node.children.map((child) => (
          <AnalyzedItem key={child.id} node={child} />
        ))}
      </ul>
    ) : null}
  </li>
);

const th = "border-b border-line px-3.5 py-2 text-left font-medium whitespace-nowrap text-muted";
const td = "border-b border-line px-3.5 py-2 align-top";

const MetricsSection = ({ metrics }: { metrics: Parameters<typeof operatorRows>[0] }) => {
  const rows = operatorRows(metrics);
  return (
    <div className="mt-4 grid gap-4">
      <Card className="overflow-x-auto">
        <h2 className="mt-0 mb-2 px-3.5 pt-3.5 text-sm font-semibold">Operators</h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className={th}>Operator</th>
              <th className={th}>Rows</th>
              <th className={th}>Elapsed</th>
              <th className={th}>Exclusive</th>
              <th className={th}>Peak memory</th>
              <th className={th}>Spilled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="[&:last-child>td]:border-b-0">
                <td
                  className={`${td} font-mono`}
                  style={{ paddingLeft: `${14 + item.depth * 12}px` }}
                >
                  {item.name}
                </td>
                <td className={td}>{item.rows}</td>
                <td className={td}>{formatDuration(item.elapsedNs)}</td>
                <td className={td}>{formatDuration(item.exclusiveNs)}</td>
                <td className={td}>{formatBytes(item.peakBytes)}</td>
                <td className={td}>{formatBytes(item.spilledBytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-3.5">
        <h2 className="mt-0 mb-2 text-sm font-semibold">Exclusive time and peak memory</h2>
        <OperatorChart rows={rows} />
      </Card>
    </div>
  );
};

const OperatorChart = ({ rows }: { rows: OperatorRow[] }) => (
  <div className="grid gap-2">
    {rows.map((item) => (
      <div key={item.id} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-xs">
        <span className="truncate font-mono" style={{ paddingLeft: item.depth * 8 }}>
          {item.name}
        </span>
        <svg
          viewBox="0 0 100 10"
          preserveAspectRatio="none"
          className="h-2.5 w-full"
          role="img"
          aria-label={item.name}
        >
          <rect width={100} height={10} className="fill-field" />
          <rect width={item.exclusiveShare * 100} height={5} className="fill-primary" />
          <rect y={5} width={item.peakShare * 100} height={5} className="fill-warning" />
        </svg>
      </div>
    ))}
    <p className="m-0 text-[11px] text-muted">
      Top bar exclusive time, bottom bar peak memory relative to the hottest operator.
    </p>
  </div>
);
