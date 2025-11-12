import { WorkflowStage } from "../jira/workflow-config";
import { SequentialStageEntry } from "./sequential-flow-builder";

export interface ProcessedFlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  flowHistory: SequentialStageEntry[];
  currentStage: WorkflowStage;
  currentStatus: string;
  done?: Date;

  // Calculated metrics
  leadTimeDays: number; // Total time from creation to done (days)
  cycleTimeDays: number; // Time from first "development" to done (days)
  ageDays: number; // How many days since creation
}

export interface FlowIssueSummary {
  total: number;
  averageAge: number;
  workInProgress: number;
  averageCycletime: number;
}