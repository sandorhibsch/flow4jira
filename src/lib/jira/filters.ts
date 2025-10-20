
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

// Status mapping for flow stages - customize this for your workflow
export const FLOW_STATUS_MAPPING = {
  // Map Jira statuses to flow stages
  'To Be Developed': 'backlog',
  'New': 'backlog',
  'Backlog': 'backlog',
  'Analyze in Progress': 'ready',
  'Work in Progress': 'in-progress',
  'In Development': 'in-progress',
  'Code Review': 'review',
  'In Review': 'review',
  'To be Tested': 'testing',
  'In Test': 'testing',
  'QA': 'testing',
  'Done': 'done',
  'Closed': 'done',
  'Accepted': 'done'
} as const;

export type FlowStage = typeof FLOW_STATUS_MAPPING[keyof typeof FLOW_STATUS_MAPPING];

export const getFlowStage = (jiraStatus: string): FlowStage => {
  return FLOW_STATUS_MAPPING[jiraStatus as keyof typeof FLOW_STATUS_MAPPING] || 'backlog';
};

// Issue type filtering - customize for your needs
export const TRACKED_ISSUE_TYPES = [
  'User Story',
  'Bug',
  'PR'
] as const;