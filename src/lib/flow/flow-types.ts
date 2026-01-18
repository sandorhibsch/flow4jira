import type { WorkflowStage } from "../jira/workflow-config";
import type { SequentialStageEntry } from "./sequential-flow-builder";

export interface ProcessedFlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  flowHistory: SequentialStageEntry[];
  currentStage: WorkflowStage;
  currentStatus: string;
  done?: Date;
  url?: string;

  // Calculated metrics
  leadTimeDays: number; // Total time from creation to done (days)
  cycleTimeDays: number; // Time from first "development" to done (days)
  ageDays: number; // How many days since creation
}

export interface FlowIssueCalculatedMetrics {
  total: number;
  averageAge: number;
  workInProgress: number;
  averageCycletime: number;
}