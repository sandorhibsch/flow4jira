import { FlowStage, WorkflowStage } from "../jira/workflow-config";
import { SequentialStageEntry } from "./build-sequential-flow";

export interface ProcessedFlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  flowHistory: SequentialStageEntry[];
  currentStage: WorkflowStage;
  currentStatus: string;

  // Calculated metrics
  leadTimeDays: number; // Total time from creation to done (days)
  cycleTimeDays: number; // Time from first "development" to done (days)
  ageDays: number; // How many days since creation
}

export interface FlowIssueTransition {
  stage: FlowStage;
  status: string; // The actual Jira status name
  enteredAt: Date; // When the issue entered this stage
}

export interface FlowIssueSummary {
  total: number;
  averageAge: number;
  workInProgress: number;
  averageCycletime: number;
}