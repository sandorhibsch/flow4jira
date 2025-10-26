
// Hardcoded filters for now - we'll make this configurable later
export const FLOW_METRICS_FILTER = {
  // Example JQL - adjust this to your specific workflow
  baseJql: `(project="PROJ" AND updated>=-30d`,
} as const;

export const buildUpdatedInLastDaysFilter = (projectKey: string, days: number = 30): string => {
  return `project = "${projectKey}" AND updated >= -${days}d ORDER BY updated DESC`;
};

export const buildStatusChangedFilter = (projectKey: string, days: number = 30): string => {
  return `project = "${projectKey}" AND status changed DURING (-${days}d, now()) ORDER BY updated DESC`;
};

export type FlowStage = 'backlog' | 'analyze' | 'ready' | 'development' | 'deployment' | 'testing' | 'release' | 'done';

export const STATUS_MAPPING: Record<string, FlowStage> = {
  // Map Jira statuses to flow stages
  'New': 'backlog',
  'Inbox': 'backlog',
  'Backlog': 'backlog',
  'Analyze in Progress': 'analyze',
  'Specification': 'analyze',
  'Planned for Release': 'ready',
  'Specification Done': 'ready',
  'Work in Progress': 'development',
  'Implementation': 'development',
  'Completed': 'deployment',
  'Implementation Done': 'deployment',
  'Waiting for CITST': 'deployment',
  'To be Tested': 'testing',
  'CITST': 'testing',
  'To be Delivered': 'release',
  'Solution to be Approved': 'release',
  'Closed': 'done',
  'Development Closed': 'done',
  'Abandonded': 'done',
  'Done': 'done'
};

export function getFlowStage(jiraStatusName: string | undefined): FlowStage {
  if (!jiraStatusName) return 'backlog';
  return STATUS_MAPPING[jiraStatusName] ?? 'backlog';
}

// Issue type filtering - customize for your needs
export const TRACKED_ISSUE_TYPES = [
  'User Story',
  'Bug',
  'PR'
] as const;