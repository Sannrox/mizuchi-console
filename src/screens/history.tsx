import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { useSession } from "../auth/session";
import { Button, Card, Notice } from "../ui/kit";
import {
  HISTORY_STATUSES,
  fetchQueryList,
  formatBytes,
  formatDuration,
  formatTime,
  hasNextPage,
  hasPrevPage,
  nextOffset,
  pageRange,
  prevOffset,
  statusTone,
  truncateSql,
  type HistorySearch,
  type HistoryStatus,
} from "./history-model";

const th = "border-b border-line px-3.5 py-2 text-left font-medium whitespace-nowrap text-muted";
const td = "border-b border-line px-3.5 py-2 align-top";
const field =
  "min-w-0 rounded-md border border-field bg-white/4 px-2.5 py-1.5 font-mono text-xs text-fg placeholder:text-muted";
const toneClass = {
  ok: "text-ok",
  bad: "text-danger",
  warning: "text-warning",
  muted: "text-muted",
} as const;

type HistoryScreenProps = { search: HistorySearch };

/** Completed queries: status, time range, text search, pagination, row → detail. */
export const History = ({ search }: HistoryScreenProps) => {
  const token = useSession((state) => state.token);
  const navigate = useNavigate({ from: "/" });
  const list = useQuery({
    queryKey: ["queries", search, token],
    queryFn: () => fetchQueryList(search, token),
    retry: false,
  });
  const range = list.data ? pageRange(list.data) : undefined;

  const apply = (next: HistorySearch) => {
    void navigate({ search: next });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-lg font-semibold">History</h1>
        <span className="text-xs text-muted">
          {list.error
            ? list.error.message
            : list.isPending
              ? "Loading"
              : list.data
                ? list.data.total === 0
                  ? "No queries"
                  : `${range?.start}–${range?.end} of ${list.data.total}`
                : ""}
        </span>
      </div>
      <Filters
        key={[search.status, search.q, search.from, search.to, search.offset, search.limit].join(
          "|",
        )}
        search={search}
        onApply={apply}
      />
      {list.error ? (
        <Notice tone="bad">{list.error.message}</Notice>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={th}>SQL</th>
                <th className={th}>Status</th>
                <th className={th}>Started</th>
                <th className={th}>Ended</th>
                <th className={th}>Duration</th>
                <th className={th}>Rows</th>
                <th className={th}>Peak memory</th>
              </tr>
            </thead>
            <tbody>
              {list.data?.queries.map((query) => (
                <tr key={query.id} className="[&:last-child>td]:border-b-0">
                  <td className={`${td} max-w-[28rem] font-mono`}>
                    <Link
                      to="/queries/$queryId"
                      params={{ queryId: query.id }}
                      className="text-fg no-underline hover:underline"
                    >
                      {truncateSql(query.sql)}
                    </Link>
                  </td>
                  <td className={`${td} ${toneClass[statusTone(query.status)]}`}>{query.status}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>
                    {formatTime(query.started_at_us)}
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>
                    {formatTime(query.ended_at_us)}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDuration(query.duration_ns)}</td>
                  <td className={td}>{query.rows}</td>
                  <td className={td}>{formatBytes(query.peak_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {list.data && (
        <div className="mt-3 flex gap-2">
          <Button
            disabled={!hasPrevPage(list.data)}
            onClick={() => apply({ ...search, offset: prevOffset(search) })}
          >
            Previous
          </Button>
          <Button
            disabled={!hasNextPage(list.data)}
            onClick={() => apply({ ...search, offset: nextOffset(search) })}
          >
            Next
          </Button>
        </div>
      )}
    </>
  );
};

const Filters = ({
  search,
  onApply,
}: {
  search: HistorySearch;
  onApply: (search: HistorySearch) => void;
}) => {
  const [draft, setDraft] = useState(search);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply({ ...draft, offset: 0, limit: search.limit });
  };
  return (
    <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={submit}>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Status
        <select
          className={field}
          value={draft.status ?? ""}
          onChange={(event) => {
            const status = event.target.value;
            setDraft((current) => {
              const next = { ...current };
              if (status === "") {
                delete next.status;
              } else {
                next.status = status as HistoryStatus;
              }
              return next;
            });
          }}
        >
          <option value="">All</option>
          {HISTORY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        Search
        <input
          className={`${field} w-56`}
          value={draft.q ?? ""}
          placeholder="SQL text"
          onChange={(event) =>
            setDraft((current) => {
              const q = event.target.value;
              const next = { ...current };
              if (q === "") {
                delete next.q;
              } else {
                next.q = q;
              }
              return next;
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        From
        <input
          className={field}
          type="datetime-local"
          value={draft.from ?? ""}
          onChange={(event) =>
            setDraft((current) => {
              const from = event.target.value;
              const next = { ...current };
              if (from === "") {
                delete next.from;
              } else {
                next.from = from;
              }
              return next;
            })
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-[11px] text-muted">
        To
        <input
          className={field}
          type="datetime-local"
          value={draft.to ?? ""}
          onChange={(event) =>
            setDraft((current) => {
              const to = event.target.value;
              const next = { ...current };
              if (to === "") {
                delete next.to;
              } else {
                next.to = to;
              }
              return next;
            })
          }
        />
      </label>
      <Button type="submit" variant="primary">
        Apply
      </Button>
    </form>
  );
};
