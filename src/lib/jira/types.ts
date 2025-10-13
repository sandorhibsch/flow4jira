export interface JiraConfig {
  baseUrl: string;
  bearerToken: string;
}

export interface JiraIssue {
  key: string;
  id: string;
  self: string;
  fields: {
    summary: string;
    created: string;
    issuetype: {
      id: string;
      name: string;
      iconUrl: string;
    };
    status: {
      id: string;
      name: string;
      statusCategory: {
        id: number;
        key: string;
        colorName: string;
        name: string;
      };
    };
    resolutiondate: string;
    // Add more fields as needed - Jira returns a LOT
  };
}

export interface JiraSearchParams {
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}
export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JiraHistoryItem {
  field: string;
  fieldtype: string;
  fieldId: string;
  from: string | null;
  fromString: string | null;
  to: string | null;
  toString: string | null;
}

export interface JiraChangelogEntry {
  id: string;
  created: string;
  author: {
    displayName: string;
    emailAddress: string;
  };
  items: JiraHistoryItem[];
}

export interface JiraChangelogResponse {
  self: string;
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: JiraChangelogEntry[];
}

// Flow-specific types derived from Jira data
export interface FlowIssue {
  key: string;
  summary: string;
  issueType: string;
  created: Date;
  statusTransitions: StatusTransition[];
}

export interface StatusTransition {
  from: string | null;
  to: string;
  transitionDate: Date;
  author: string;
}