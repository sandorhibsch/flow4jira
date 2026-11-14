import type { JiraConfig, JiraIssue } from '@/lib/jira/jira-types';
import type { JiraIssueSource } from '@/lib/services/board-metrics.contracts';
import type { RepositoryResult } from '@/lib/repositories/board-config.types';

export class JiraBoardIssueProvider implements JiraIssueSource {
  constructor(
    private readonly fetchResponse: typeof fetch = (input, init) => fetch(input, init),
    private readonly getCredentials: () => JiraConfig | null | undefined = () => undefined
  ) { }

  async fetchIssues(query: {
    boardId: string;
    periodDays: number;
  }): Promise<RepositoryResult<JiraIssue[]>> {
    const response = await this.fetchResponse('/api/flow/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...query, config: this.getCredentials() })
    });
    const result = (await response.json()) as {
      success: boolean;
      data?: { issues: JiraIssue[] };
      error?: string;
    };
    if (response.ok && result.success && Array.isArray(result.data?.issues)) {
      return { success: true, data: result.data.issues };
    }
    return { success: false, error: result.error ?? 'Failed to fetch issues' };
  }
}
