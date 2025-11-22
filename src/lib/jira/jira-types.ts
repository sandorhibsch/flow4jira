export interface JiraConfig {
  baseUrl: string;
  bearerToken: string;
}

export interface JiraIssue {
  expand?: string;
  id: string;
  self: string;
  key: string;
  fields: {
    summary: string;
    created: string;
    resolutiondate: string | null;
    issuetype: {
      self?: string;
      id: string;
      description?: string;
      iconUrl: string;
      name: string;
      subtask?: boolean;
      avatarId?: number;
    };
    status: {
      self?: string,
      description?: string;
      iconUrl?: string;
      name: string;
      id: string;
      statusCategory: {
        self?: string;
        id: number;
        key: string;
        colorName: string;
        name: string;
      };
    };
  };
  changelog?: JiraChangelogResponse;
  // Add more fields as needed - Jira returns a LOT

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
  histories: JiraChangelogEntry[];
}

export interface JiraStatus {
  id: string;
}

export interface JiraColumn {
  name: string;
  statuses: JiraStatus[]
}

export interface JiraBoardConfigResponse {
  id: string;
  name: string;
  type: "Kanban" | "scrum";
  columnConfig: {
    columns: JiraColumn[];
  }
}

export interface JiraStatusResponse {
  id: string;
  name: string;
  statusCategory: {
    name: string;
  }

}