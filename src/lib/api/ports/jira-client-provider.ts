import type { JiraClientBase } from '@/lib/jira/jira-client-base';
import type { JiraConfig } from '@/lib/jira/jira-types';

export interface JiraClientProvider {
  create(config?: JiraConfig): JiraClientBase;
}
