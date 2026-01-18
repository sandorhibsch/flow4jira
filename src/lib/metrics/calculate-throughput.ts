import type { ProcessedFlowIssue } from "../flow/flow-types";

export function calculateThroughput(
  issues: ProcessedFlowIssue[],
  periodDays: number
): number[] {
  // Create array of length = periodDays filled with zeros
  const throughput = Array(periodDays).fill(0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const issue of issues) {
    if (!issue.done) continue;

    const doneDate = new Date(issue.done);
    doneDate.setHours(0, 0, 0, 0);

    const diffDays =
      Math.floor((today.getTime() - doneDate.getTime()) / (24 * 60 * 60 * 1000));

    // Only count if inside the period and not in the future
    if (diffDays >= 0 && diffDays < periodDays) {
      throughput[periodDays - diffDays - 1] += 1;
    }
  }

  return throughput;
}
