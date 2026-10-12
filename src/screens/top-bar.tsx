import { Link, useRouterState } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { useState } from "react";
import { useSession } from "../auth/session";
import { Button } from "../ui/kit";
import { defaultHistorySearch } from "./history-model";

const TABS = [{ label: "History", to: "/" }] as const;

const field =
  "min-w-0 rounded-md border border-field bg-white/4 px-2.5 py-1.5 font-mono text-xs text-fg placeholder:text-muted";

/** Product name, the history tab, and an in-memory bearer field. */
export const TopBar = () => {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const setToken = useSession((state) => state.setToken);
  const present = useSession((state) => Boolean(state.token));
  const [value, setValue] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setToken(value === "" ? undefined : value);
  };

  return (
    <header className="flex flex-wrap items-center gap-2.5 border-b border-line px-6 py-2.5">
      <span className="text-[13px] font-semibold">mizuchi</span>
      <nav className="ml-3 flex gap-4 text-[13px] font-medium">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            search={defaultHistorySearch()}
            className={
              path === tab.to
                ? "py-1.5 text-fg no-underline shadow-[inset_0_-2px_0_var(--color-primary)]"
                : "py-1.5 text-muted no-underline"
            }
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <form className="ml-auto flex items-center gap-2" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="bearer-token">
          Bearer token
        </label>
        <input
          id="bearer-token"
          className={field}
          type="password"
          autoComplete="off"
          placeholder="Bearer token"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit">{present ? "Update token" : "Use token"}</Button>
      </form>
    </header>
  );
};
