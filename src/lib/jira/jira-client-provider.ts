import type { JiraClientProvider } from '@/lib/api/ports/jira-client-provider';
import type { JiraClientBase } from './jira-client-base';
import { JiraClientFactory } from './jira-client-factory';
import type { JiraConfig } from './jira-types';

export class JiraClientFactoryProvider implements JiraClientProvider {
  create(config?: JiraConfig): JiraClientBase {
    const resolvedConfig = config ?? JiraClientFactory.createConfigFromEnv();
    return JiraClientFactory.create(resolvedConfig);
  }
}

export const jiraClientProvider = new JiraClientFactoryProvider();
