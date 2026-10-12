import type { ServerCheck } from "../api/http";
import { MIZUCHI_CONTRACT } from "../api/mizuchi.gen";
import { Centered, Title } from "../ui/kit";

/** Shown instead of the app when the server is too old for this console. */
export const ServerStatus = ({ check }: { check: Extract<ServerCheck, { kind: "too-old" }> }) => (
  <Centered>
    <Title subtitle="Can't reach this engine" />
    <p role="alert" className="m-0 text-xs text-danger">
      mizuchi {check.version} is too old for this console. It does not serve {MIZUCHI_CONTRACT}.
    </p>
  </Centered>
);
