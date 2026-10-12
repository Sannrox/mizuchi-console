import { describe, expect, it } from "vitest";
import type { OperatorMetrics } from "../api/mizuchi.gen";
import { operatorRows } from "./metrics-model";

const node = (
  name: string,
  exclusive_ns: number,
  peak_bytes: number,
  children: OperatorMetrics[] = [],
): OperatorMetrics => ({
  name,
  rows: 10,
  batches: 1,
  elapsed_ns: exclusive_ns,
  exclusive_ns,
  blocking: false,
  peak_bytes,
  copied_bytes: 0,
  spilled_bytes: name === "Sort" ? 2048 : 0,
  children,
});

describe("operatorRows", () => {
  it("flattens the recorded metrics tree with exclusive and peak shares", () => {
    const rows = operatorRows(
      node("HashJoin", 30, 400, [node("Scan", 80, 100), node("Sort", 10, 200)]),
    );
    expect(rows.map((row) => row.name)).toStrictEqual(["HashJoin", "Scan", "Sort"]);
    expect(rows[0]?.depth).toBe(0);
    expect(rows[1]?.depth).toBe(1);
    expect(rows[1]?.exclusiveShare).toBe(80 / 120);
    expect(rows[0]?.peakShare).toBe(1);
    expect(rows[2]?.spilledBytes).toBe(2048);
    expect(rows[1]?.rows).toBe(10);
  });
});
