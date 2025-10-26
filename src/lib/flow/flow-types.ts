import { FlowStage } from "../jira/workflow-config";

export interface StatusTransition {
  transitionDate: Date;
  from: string;
  to: string;
  fromStage: FlowStage;
  toStage: FlowStage;
}

export interface FlowIssueTransition {
  stage: FlowStage;
  status: string; // The actual Jira status name
  enteredAt: Date; // When the issue entered this stage
  exitedAt?: Date | null; // When it left this stage (null if still in stage)
  durationMs?: number; // How long it spent in this stage (0 if still in stage)
}

export interface ProcessedFlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  statusHistory: FlowIssueTransition[];
  flowHistory: FlowIssueTransition[];
  currentStage: FlowStage;
  currentStatus: string;

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