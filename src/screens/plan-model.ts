import type { OperatorMetrics, Query } from "../api/mizuchi.gen";

/** Prefer the detail `plan` field; fall back to the required report plan. */
export const queryPlanText = (query: Query): string | undefined => {
  if (query.plan) {
    return query.plan;
  }
  if (query.report?.plan) {
    return query.report.plan;
  }
  return undefined;
};

export type TextNode = { id: string; label: string; children: TextNode[] };

export type AnalyzedNode = {
  id: string;
  name: string;
  rows: number;
  batches: number;
  elapsedNs: number;
  exclusiveNs: number;
  children: AnalyzedNode[];
  slowest: boolean;
};

const LOGICAL = "== Logical Plan ==";
const PHYSICAL = "== Physical Plan ==";

/** Split the stored report plan into logical and physical EXPLAIN text. */
export const splitPlanText = (plan: string): { logical: string; physical: string } => {
  const logicalAt = plan.indexOf(LOGICAL);
  const physicalAt = plan.indexOf(PHYSICAL);
  if (logicalAt === -1 && physicalAt === -1) {
    return { logical: plan.trim(), physical: "" };
  }
  const logicalStart = logicalAt === -1 ? 0 : logicalAt + LOGICAL.length;
  const logicalEnd = physicalAt === -1 ? plan.length : physicalAt;
  const physicalStart = physicalAt === -1 ? plan.length : physicalAt + PHYSICAL.length;
  return {
    logical: plan.slice(logicalStart, logicalEnd).trim(),
    physical: plan.slice(physicalStart).trim(),
  };
};

const indentOf = (line: string): number => line.length - line.trimStart().length;

/**
 * Parse a 1-space-indented EXPLAIN dump into a forest. Parent lines own every
 * following line with a strictly greater indent until the indent returns.
 */
export const parseIndentedTree = (text: string): TextNode[] => {
  const lines = text
    .split("\n")
    .map((line) => line.replaceAll("\t", " "))
    .filter((line) => line.trim());
  const roots: TextNode[] = [];
  const stack: { indent: number; node: TextNode }[] = [];
  let nextId = 0;
  for (const line of lines) {
    const indent = indentOf(line);
    const node: TextNode = { id: `n${nextId}`, label: line.trim(), children: [] };
    nextId += 1;
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top && top.indent < indent) {
        break;
      }
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    if (parent) {
      parent.node.children.push(node);
    } else {
      roots.push(node);
    }
    stack.push({ indent, node });
  }
  return roots;
};

const withIds = (node: OperatorMetrics, path: string, hottest: Set<string>): AnalyzedNode => ({
  id: path,
  name: node.name,
  rows: node.rows,
  batches: node.batches,
  elapsedNs: node.elapsed_ns,
  exclusiveNs: node.exclusive_ns,
  slowest: hottest.has(path),
  children: node.children.map((child, index) => withIds(child, `${path}.${index}`, hottest)),
});

const collectIds = (
  node: OperatorMetrics,
  path: string,
): { path: string; exclusiveNs: number }[] => [
  { path, exclusiveNs: node.exclusive_ns },
  ...node.children.flatMap((child, index) => collectIds(child, `${path}.${index}`)),
];

/** Mark the hottest exclusive-time operators (up to three, excluding zeros). */
export const hottestPaths = (root: OperatorMetrics, limit = 3): Set<string> => {
  const ranked = collectIds(root, "0")
    .filter((node) => node.exclusiveNs > 0)
    .toSorted((a, b) => b.exclusiveNs - a.exclusiveNs);
  return new Set(ranked.slice(0, limit).map((node) => node.path));
};

/** Physical tree with ANALYZE overlay and slowest-operator marks. */
export const analyzedTree = (metrics: OperatorMetrics): AnalyzedNode =>
  withIds(metrics, "0", hottestPaths(metrics));

export const planView = (
  plan: string | null | undefined,
  metrics: OperatorMetrics | null | undefined,
): { logical: TextNode[]; physical: TextNode[]; analyzed: AnalyzedNode | undefined } => {
  const text = splitPlanText(plan ?? "");
  return {
    logical: parseIndentedTree(text.logical),
    physical: metrics ? [] : parseIndentedTree(text.physical),
    analyzed: metrics ? analyzedTree(metrics) : undefined,
  };
};
