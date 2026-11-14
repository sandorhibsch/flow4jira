import { JiraBoardIssueProvider } from '@/lib/api/jira-board-issue-provider';
import { processJiraIssue } from '@/lib/flow/processor';
import {
  getBoardConfigClient,
  isServerPersistenceMode
} from '@/lib/repositories/client/board-config-client-factory';
import { getJiraConfigFromLocalStorage } from '@/lib/repositories/jira-config.local.repository';
import { BoardMetricsService } from '@/lib/services/board-metrics-service';
import type { BoardMetricsOperations } from '@/lib/services/board-metrics.contracts';

export function getBoardMetricsService(): BoardMetricsOperations {
  const credentials = isServerPersistenceMode() ? () => undefined : getJiraConfigFromLocalStorage;
  return new BoardMetricsService(
    getBoardConfigClient(),
    new JiraBoardIssueProvider(undefined, credentials),
    processJiraIssue
  );
}
