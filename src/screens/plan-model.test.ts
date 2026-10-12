import { describe, expect, it } from "vitest";
import type { OperatorMetrics } from "../api/mizuchi.gen";
import {
  analyzedTree,
  hottestPaths,
  parseIndentedTree,
  planView,
  queryPlanText,
  splitPlanText,
} from "./plan-model";

const recordedPlan = `== Logical Plan ==
Limit skip=2 fetch=10
 Sort [a]
  Project [a: a]
   Filter a > 1
    Scan t
== Physical Plan ==
Limit
 Sort
  Project
   Filter
    Scan
`;

const metrics = (
  name: string,
  exclusive_ns: number,
  elapsed_ns: number,
  children: OperatorMetrics[] = [],
): OperatorMetrics => ({
  name,
  rows: 10,
  batches: 1,
  elapsed_ns,
  exclusive_ns,
  blocking: false,
  peak_bytes: 0,
  copied_bytes: 0,
  children,
});

describe("splitPlanText", () => {
  it("splits logical and physical EXPLAIN dumps", () => {
    const { logical, physical } = splitPlanText(recordedPlan);
    expect(logical.startsWith("Limit skip=2 fetch=10")).toBe(true);
    expect(physical.startsWith("Limit")).toBe(true);
    expect(logical).toContain("Scan t");
    expect(physical).not.toContain("Logical");
  });
});

describe("parseIndentedTree", () => {
  it("builds a tree from 1-space indents", () => {
    const tree = parseIndentedTree(splitPlanText(recordedPlan).logical);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.label).toBe("Limit skip=2 fetch=10");
    expect(tree[0]?.children[0]?.label).toBe("Sort [a]");
    expect(tree[0]?.children[0]?.children[0]?.children[0]?.children[0]?.label).toBe("Scan t");
  });
});

describe("analyzedTree", () => {
  it("overlays ANALYZE metrics and marks the slowest operators", () => {
    const root = metrics("HashJoin", 30, 120, [metrics("Scan", 80, 80), metrics("Scan", 10, 10)]);
    expect([...hottestPaths(root)]).toEqual(["0.0", "0", "0.1"]);
    const tree = analyzedTree(root);
    expect(tree.name).toBe("HashJoin");
    expect(tree.slowest).toBe(true);
    expect(tree.children[0]?.slowest).toBe(true);
    expect(tree.children[0]?.rows).toBe(10);
    expect(tree.children[0]?.batches).toBe(1);
    expect(tree.children[0]?.elapsedNs).toBe(80);
  });
});

describe("queryPlanText", () => {
  it("falls back to report.plan when the top-level plan is absent", () => {
    expect(
      queryPlanText({
        id: "q-1",
        sql: "select 1",
        status: "completed",
        started_at_us: 0,
        ended_at_us: 1,
        duration_ns: 1,
        rows: 1,
        peak_bytes: 0,
        spilled_bytes: 0,
        report: {
          engine_version: "0.1.0",
          plan: recordedPlan,
          inputs: [],
          outputs: [],
        },
      }),
    ).toBe(recordedPlan);
  });
});

describe("planView", () => {
  it("uses metrics as the physical tree when present", () => {
    const view = planView(recordedPlan, metrics("Limit", 5, 5, [metrics("Scan", 9, 9)]));
    expect(view.logical[0]?.label).toBe("Limit skip=2 fetch=10");
    expect(view.physical).toEqual([]);
    expect(view.analyzed?.name).toBe("Limit");
    expect(view.analyzed?.children[0]?.name).toBe("Scan");
  });

  it("falls back to the physical EXPLAIN text without metrics", () => {
    const view = planView(recordedPlan, null);
    expect(view.analyzed).toBeUndefined();
    expect(view.physical[0]?.label).toBe("Limit");
    expect(view.physical[0]?.children[0]?.label).toBe("Sort");
  });
});
