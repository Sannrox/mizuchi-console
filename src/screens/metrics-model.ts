import type { OperatorMetrics } from "../api/mizuchi.gen";

export type OperatorRow = {
  id: string;
  depth: number;
  name: string;
  rows: number;
  elapsedNs: number;
  exclusiveNs: number;
  peakBytes: number;
  spilledBytes: number;
  exclusiveShare: number;
  peakShare: number;
};

const walk = (node: OperatorMetrics, path: string, depth: number, out: OperatorRow[]): void => {
  out.push({
    id: path,
    depth,
    name: node.name,
    rows: node.rows,
    elapsedNs: node.elapsed_ns,
    exclusiveNs: node.exclusive_ns,
    peakBytes: node.peak_bytes,
    spilledBytes: node.spilled_bytes ?? 0,
    exclusiveShare: 0,
    peakShare: 0,
  });
  node.children.forEach((child, index) => walk(child, `${path}.${index}`, depth + 1, out));
};

const share = (value: number, total: number): number => (total === 0 ? 0 : value / total);

/** Depth-first operator table with bar-chart shares for exclusive time and peak memory. */
export const operatorRows = (root: OperatorMetrics): OperatorRow[] => {
  const rows: OperatorRow[] = [];
  walk(root, "0", 0, rows);
  const exclusiveTotal = rows.reduce((sum, row) => sum + row.exclusiveNs, 0);
  const peakMax = rows.reduce((max, row) => Math.max(max, row.peakBytes), 0);
  for (const row of rows) {
    row.exclusiveShare = share(row.exclusiveNs, exclusiveTotal);
    row.peakShare = share(row.peakBytes, peakMax);
  }
  return rows;
};
