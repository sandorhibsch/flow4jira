'use client';

import { useState, useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { processJiraIssue } from '@/lib/flow/processor';
import { WorkflowDefinition } from '@/lib/jira/workflow-config';
import { BoardConfigMetadata, BoardConfigWithMetadata, WorkflowConfigService } from '@/lib/services/workflow-config-service';

import CollapsibleSection from '@/ui/collapsible-section';
import CycleTimeScatterplot from '@/ui/cycletime-scatterplot';
import AgingScatterplot from '@/ui/aging-scatterplot';
import CumulativeFlowDiagram from '@/ui/cumulative-flow-diagram';
import { JiraIssue } from '@/lib/jira/jira-types';
import { MonteCarloHowManyChart } from '@/ui/montecarlo-howmany';
import { MonteCarloWhenChart } from '@/ui/montecarlo-when';
import FlowIssueTable from '@/ui/flow-issue-table';

type IssueListResult = {
  success: boolean;
  data?: {
    issues: JiraIssue[];
  };
  error?: string;
};

type BoardResult = {
  success: boolean;
  data?: {
    metadata: BoardConfigMetadata;
    workflow: WorkflowDefinition;
    issues: ProcessedFlowIssue[];
  };
  error?: string;
}

export default function BoardMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.boardId as string;

  const [periodDays, setPeriodDays] = useState('');
  const [additionalJql, setAdditionalJql] = useState('');

  const [result, setResult] = useState<BoardResult>();
  const [boardConfig, setBoardConfig] = useState<BoardConfigMetadata>();
  const [boardWorkflow, setBoardWorkflow] = useState<WorkflowDefinition>();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load board config metadata
    const savedBoard: BoardConfigWithMetadata | null = WorkflowConfigService.loadWithMetadata(boardId);

    if (savedBoard) {
      const boardResult: BoardResult = {
        success: true,
        data: {
          metadata: savedBoard.metadata,
          workflow: savedBoard.workflow,
          issues: savedBoard.processedIssues || []
        }
      }

      setResult(boardResult);
      setPeriodDays(savedBoard.metadata.periodDays);
      setBoardConfig(savedBoard.metadata);
      setBoardWorkflow(savedBoard.workflow);
    } else {
      // No config found - redirect to configure
      const shouldConfigure = window.confirm(
        `No workflow configuration found for board ${boardId}. Would you like to configure it now?`
      );
      if (shouldConfigure) {
        router.push(`/boards/${boardId}/configure`);
      } else {
        router.push('/');
      }
    }
  }, [boardId, router]);

  const processIssuesWithWorkflow = async () => {
    if (!boardId) {
      alert('Board ID is required');
      return;
    }

    setLoading(true);

    try {
      const url = `/api/flow/board?boardId=${encodeURIComponent(boardId)}&periodDays=${encodeURIComponent(periodDays)}&additionalJql=${encodeURIComponent(additionalJql)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const issueListResult: IssueListResult = await response.json();

      // Load and process issues
      if (issueListResult.success && issueListResult.data && boardConfig && boardWorkflow) {
        const processedIssues = issueListResult.data?.issues.map(issue => {
          const issueWithChangelog = issue as JiraIssue;
          const changelog = issueWithChangelog.changelog;
          return processJiraIssue(boardWorkflow, issue, changelog);
        });

        WorkflowConfigService.save(boardId, periodDays, boardWorkflow, boardConfig.boardName, boardConfig.boardType, processedIssues);
      }


      const savedBoard: BoardConfigWithMetadata | null = WorkflowConfigService.loadWithMetadata(boardId);

      if (savedBoard) {
        const boardResult: BoardResult = {
          success: true,
          data: {
            metadata: savedBoard.metadata,
            workflow: savedBoard.workflow,
            issues: savedBoard.processedIssues || []
          }
        }

        setResult(boardResult);
        setPeriodDays(savedBoard.metadata.periodDays);
        setBoardConfig(savedBoard.metadata);
        setBoardWorkflow(savedBoard.workflow);
      }

    } catch (error) {
      setResult({
        success: false,
        error: "Failed to fetch flow metrics"
      });
      console.error('Failed to fetch flow metrics: ', error);
    } finally {
      setLoading(false);
    }
  };

  if (!result?.data?.metadata) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-500">Loading board configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header with Navigation */}
        {result && result.success && result.data && (
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <Link href="/" className="hover:text-blue-600">Boards</Link>
              <span>/</span>
              <span className="text-gray-900">{result.data.metadata.boardName || `Board ${boardId}`}</span>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {result.data.metadata.boardName || `Board ${boardId}`}
                </h1>
                {result.data.issues.length != 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Last refreshed data from last <span className="font-bold">{result.data.metadata.periodDays}</span> days on <span className="font-bold">{new Date(result.data.metadata.lastFetched).toDateString()}</span>
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
        )}

        {/* Query Input */}
        {result && result.success && result.data && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Analysis Period (days)</h2>

            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <input
                  type="number"
                  value={periodDays}
                  onChange={(e) => setPeriodDays(e.target.value)}

                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  placeholder='Enter additional filter (valid JQL expression)'
                  value={additionalJql}
                  onChange={(e) => setAdditionalJql(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={processIssuesWithWorkflow}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load issues'}
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Analyze issues updated in the last N days
            </p>
          </div>
        )}

        {/* Error Display */}
        {result && !result.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{result.error}</p>
          </div>
        )}

        {/* Results */}
        {result && result.success && result.data && result.data.issues.length != 0 && (
          <>
            {/* Process health*/}
            <CollapsibleSection title="Aging Chart">
              <AgingScatterplot issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
            <CollapsibleSection title={`Cumulative Flow Diagram`}>
              <CumulativeFlowDiagram issues={result.data.issues} workflow={result.data.workflow} periodDays={parseInt(result.data.metadata.periodDays)} />
            </CollapsibleSection>
            {/* Single-item forecast*/}
            <CollapsibleSection title={`Cycle Time Scatterplot`}>
              <CycleTimeScatterplot issues={result.data.issues} periodDays={parseInt(result.data.metadata.periodDays)} />
            </CollapsibleSection>

            {/*Multi-item forecasts */}
            <CollapsibleSection title={`Forecast - Number of Items Completed`}>
              <MonteCarloHowManyChart issues={result.data.issues} periodDays={parseInt(result.data.metadata.periodDays)} />
            </CollapsibleSection>
            <CollapsibleSection title={`Forecast - Days Required to Complete Next X Items`}>
              <MonteCarloWhenChart issues={result.data.issues} periodDays={parseInt(result.data.metadata.periodDays)} />
            </CollapsibleSection>

            {/* Full issue list*/}
            <CollapsibleSection title="Issues">
              <FlowIssueTable issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
          </>
        )}

        {/* Empty State */}
        {(!result || result.success && result.data && result.data.issues.length === 0) && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-gray-500">
              Set the analysis period above and click &quot;Load Issues&quot; to see your metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}