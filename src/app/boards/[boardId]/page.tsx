'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { processJiraIssue } from '@/lib/flow/processor';
import type { JiraIssue } from '@/lib/jira/jira-types';
import { useBoardConfig } from '@/hooks/use-board-config';

import CollapsibleSection from '@/ui/collapsible-section';
import CycleTimeScatterplot from '@/ui/cycletime-scatterplot';
import AgingScatterplot from '@/ui/aging-scatterplot';
import CumulativeFlowDiagram from '@/ui/cumulative-flow-diagram';
import { MonteCarloHowManyChart } from '@/ui/montecarlo-howmany';
import { MonteCarloWhenChart } from '@/ui/montecarlo-when';
import FlowIssueTable from '@/ui/flow-issue-table';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ChartErrorBoundary } from '@/components/ui/error-boundary';
import ThroughputHistogram from '@/ui/throughput-histogram';
import { getJiraConfigFromLocalStorage } from '@/lib/repositories/jira-config.local.repository';
import { isServerPersistenceMode } from '@/lib/repositories/client/board-config-client-factory';

interface IssueListResult {
  success: boolean;
  data?: {
    issues: JiraIssue[];
  };
  error?: string;
}

export default function BoardMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.boardId as string;

  // Use the async hook for board configuration
  const {
    isLoading: configLoading,
    isSaving,
    error: configError,
    metadata,
    workflow,
    processedIssues,
    save: saveConfig,
  } = useBoardConfig(boardId);

  const [periodDays, setPeriodDays] = useState<number | null>(null);
  const [additionalJql, setAdditionalJql] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dialog state
  const [confirmConfigOpen, setConfirmConfigOpen] = useState(false);

  // Sync periodDays when metadata changes (proper useEffect instead of render-time setState)  
  useEffect(() => {
    if (metadata?.periodDays && periodDays === null) {
      setPeriodDays(metadata.periodDays);
    }
  }, [metadata?.periodDays, periodDays]);

  const processIssuesWithWorkflow = useCallback(async () => {
    if (!boardId) {
      setFetchError('Board ID is required');
      return;
    }

    if (!workflow || !metadata || periodDays === null) {
      setFetchError('Board configuration not loaded');
      return;
    }

    setFetchLoading(true);
    setFetchError(null);

    try {
      const jiraConfig = isServerPersistenceMode() ? undefined : getJiraConfigFromLocalStorage();
      const response = await fetch('/api/flow/board', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boardId: boardId,
          periodDays: periodDays,
          additionalJql: additionalJql,
          config: jiraConfig
        })
      });

      const issueListResult: IssueListResult = await response.json();

      if (issueListResult.success && issueListResult.data) {
        // Process issues with the workflow
        const newProcessedIssues: ProcessedFlowIssue[] = issueListResult.data.issues.map(
          (issue) => {
            const changelog = issue.changelog;
            return processJiraIssue(workflow, issue, changelog);
          }
        );

        // Save via API (async)
        const saved = await saveConfig(
          periodDays,
          workflow,
          metadata.boardName,
          metadata.boardType,
          newProcessedIssues
        );

        if (!saved) {
          setFetchError('Failed to save processed issues');
        }
      } else {
        setFetchError(issueListResult.error ?? 'Failed to fetch issues');
      }
    } catch (error) {
      setFetchError('Failed to fetch flow metrics');
      console.error('Failed to fetch flow metrics:', error);
    } finally {
      setFetchLoading(false);
    }
  }, [boardId, workflow, metadata, periodDays, additionalJql, saveConfig]);

  // Handle redirect if no config found
  const handleConfigureRedirect = () => {
    router.push(`/boards/${boardId}/configure`);
  };

  // Loading state
  if (configLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500">Loading board configuration...</p>
        </div>
      </div>
    );
  }

  // No config found - prompt to configure
  if (!metadata && !configLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Configuration Found</h3>
            <p className="text-gray-500 mb-6">
              Board {boardId} needs to be configured before viewing metrics.
            </p>
            <div className="space-x-4">
              <button
                onClick={handleConfigureRedirect}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
              >
                Configure Board
              </button>
              <Link
                href="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-6 rounded inline-block"
              >
                Back to Boards
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const loading = fetchLoading || isSaving;
  const error = fetchError ?? configError;
  const hasIssues = processedIssues.length > 0;
  const displayPeriodDays = periodDays ?? metadata?.periodDays ?? 30;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-blue-600">
              Boards
            </Link>
            <span>/</span>
            <span className="text-gray-900">{metadata?.boardName ?? `Board ${boardId}`}</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {metadata?.boardName ?? `Board ${boardId}`}
              </h1>
              {hasIssues && metadata?.updatedAt && (
                <p className="text-sm text-gray-600 mt-1">
                  Last refreshed data from last{' '}
                  <span className="font-bold">{metadata.periodDays}</span> days on{' '}
                  <span className="font-bold">{new Date(metadata.updatedAt).toDateString()}</span>
                </p>
              )}
            </div>
            <Link
              href={`/boards/${boardId}/configure`}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded"
            >
              ⚙️ Configure Workflow
            </Link>
          </div>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Analysis Period (days)</h2>

          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <input
                type="number"
                value={periodDays ?? ''}
                onChange={(e) => setPeriodDays(e.target.value ? parseInt(e.target.value, 10) : null)}
                min="1"
                max="365"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter additional filter (valid JQL expression)"
                value={additionalJql}
                onChange={(e) => setAdditionalJql(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={processIssuesWithWorkflow}
              disabled={loading || periodDays === null}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load issues'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">Analyze issues updated in the last N days</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {hasIssues && workflow && (
          <>
            {/* Process health */}
            <CollapsibleSection title="Aging Chart">
              <ChartErrorBoundary title="Aging Chart">
                <AgingScatterplot issues={processedIssues} workflow={workflow} />
              </ChartErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection title="Cumulative Flow Diagram">
              <ChartErrorBoundary title="Cumulative Flow Diagram">
                <CumulativeFlowDiagram
                  issues={processedIssues}
                  workflow={workflow}
                  periodDays={displayPeriodDays}
                />
              </ChartErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection title="Throughput histogram">
              <ThroughputHistogram issues={processedIssues} periodDays={displayPeriodDays}></ThroughputHistogram>
            </CollapsibleSection>

            {/* Single-item forecast */}
            <CollapsibleSection title="Cycle Time Scatterplot">
              <ChartErrorBoundary title="Cycle Time Scatterplot">
                <CycleTimeScatterplot issues={processedIssues} periodDays={displayPeriodDays} />
              </ChartErrorBoundary>
            </CollapsibleSection>

            {/* Multi-item forecasts */}
            <CollapsibleSection title="Forecast - Number of Items Completed">
              <ChartErrorBoundary title="Monte Carlo Forecast">
                <MonteCarloHowManyChart issues={processedIssues} periodDays={displayPeriodDays} />
              </ChartErrorBoundary>
            </CollapsibleSection>
            <CollapsibleSection title="Forecast - Days Required to Complete Next X Items">
              <ChartErrorBoundary title="Monte Carlo Forecast">
                <MonteCarloWhenChart issues={processedIssues} periodDays={displayPeriodDays} />
              </ChartErrorBoundary>
            </CollapsibleSection>

            {/* Full issue list */}
            <CollapsibleSection title="Issues">
              <ChartErrorBoundary title="Issue Table">
                <FlowIssueTable issues={processedIssues} workflow={workflow} />
              </ChartErrorBoundary>
            </CollapsibleSection>
          </>
        )}

        {/* Empty State */}
        {!hasIssues && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Analyze</h3>
            <p className="text-gray-500">
              Set the analysis period above and click &quot;Load Issues&quot; to see your metrics
            </p>
          </div>
        )}
      </div>

      {/* Config dialog */}
      <ConfirmDialog
        isOpen={confirmConfigOpen}
        title="No Configuration Found"
        message={`No workflow configuration found for board ${boardId}. Would you like to configure it now?`}
        onConfirm={() => {
          setConfirmConfigOpen(false);
          router.push(`/boards/${boardId}/configure`);
        }}
        onCancel={() => {
          setConfirmConfigOpen(false);
          router.push('/');
        }}
      />
    </div>
  );
}
