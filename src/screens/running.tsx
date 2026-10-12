import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useSession } from "../auth/session";
import { Card, ConfirmButton, Notice } from "../ui/kit";
import { formatDuration, formatTime, truncateSql } from "./history-model";
import {
  POLL_MS,
  cancelFailure,
  cancelOutcome,
  cancelQuery,
  fetchRunningList,
} from "./running-model";

const th = "border-b border-line px-3.5 py-2 text-left font-medium whitespace-nowrap text-muted";
const td = "border-b border-line px-3.5 py-2 align-top";

/** In-flight queries, polled; cancel is hidden without a token and sent once. */
export const Running = () => {
  const token = useSession((state) => state.token);
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["running", token],
    queryFn: () => fetchRunningList(token),
    retry: false,
    refetchInterval: POLL_MS,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => {
      if (!token) {
        throw new Error("missing token");
      }
      return cancelQuery(id, token);
    },
    retry: false,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["running"] }),
  });
  const count = list.data?.queries.length;
  const notice =
    cancel.data && cancel.variables
      ? cancelOutcome(cancel.data)
      : cancel.error
        ? cancelFailure(cancel.error)
        : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-lg font-semibold">Running</h1>
        <span className="text-xs text-muted">
          {list.error
            ? list.error.message
            : list.isPending
              ? "Loading"
              : count === 0
                ? "No running queries"
                : `${count} ${count === 1 ? "query" : "queries"}`}
        </span>
      </div>
      {list.error && !list.data ? (
        <Notice tone="bad">{list.error.message}</Notice>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={th}>SQL</th>
                <th className={th}>Stage</th>
                <th className={th}>Started</th>
                <th className={th}>Elapsed</th>
                {token ? <th className={th}>Cancel</th> : null}
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
                  <td className={td}>{query.stage}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>
                    {formatTime(query.started_at_us)}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDuration(query.elapsed_ns)}</td>
                  {token ? (
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ConfirmButton
                          label="Cancel"
                          confirm="Confirm cancel"
                          dismiss="Keep running"
                          disabled={cancel.isPending && cancel.variables === query.id}
                          onConfirm={() => cancel.mutate(query.id)}
                        />
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {notice && cancel.variables ? (
        <div className="mt-3">
          <Notice tone={notice.tone}>
            {cancel.variables}: {notice.text}
          </Notice>
        </div>
      ) : null}
    </>
  );
};
