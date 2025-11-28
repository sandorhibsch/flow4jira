'use client';

import { useState, useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { processJiraIssue } from '@/lib/flow/processor';
import { DEFAULT_WORKFLOW, WorkflowDefinition } from '@/lib/jira/workflow-config';
import { WorkflowConfigService } from '@/lib/services/workflow-config-service';

import CollapsibleSection from '@/ui/collapsible-section';
import FlowIssueList from '@/ui/flow-issue-list';
import CycleTimeScatterplot from '@/ui/cycletime-scatterplot';
import AgingScatterplot from '@/ui/aging-scatterplot';
import CumulativeFlowDiagram from '@/ui/cumulative-flow-diagram';
import { JiraIssue } from '@/lib/jira/jira-types';
import { MonteCarloHowManyChart } from '@/ui/montecarlo-howmany';
import { MonteCarloWhenChart } from '@/ui/montecarlo-when';

type IssueListResult = {
  success: boolean;
  data?: {
    issues: JiraIssue[];
  };
  error?: string;
};

type FlowResult = {
  success: boolean;
  data?: {
    issues: ProcessedFlowIssue[];
    workflow: WorkflowDefinition;
  };
  error?: string;
}

export default function BoardMetricsPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.boardId as string;

  const [periodDays, setPeriodDays] = useState('30');
  const [result, setResult] = useState<FlowResult>();
  const [loading, setLoading] = useState(false);
  const [boardConfig, setBoardConfig] = useState<{ boardName?: string; boardType?: string, workflowName?: string; issues?: ProcessedFlowIssue[] }>();

  useEffect(() => {
    // Load board config metadata
    const config = WorkflowConfigService.loadWithMetadata(boardId);
    if (config) {
      setBoardConfig({
        boardName: config.metadata.boardName,
        boardType: config.metadata.boardType,
        workflowName: config.workflow.name
      });

      const flowResult = {
        success: true,
        data: {
          issues: config.processedIssues || [],
          workflow: config.workflow
        }
      }

      setResult(flowResult);
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
      const url = `/api/flow/board?boardId=${encodeURIComponent(boardId)}&periodDays=${encodeURIComponent(periodDays)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data: IssueListResult = await response.json();

      // Load custom workflow
      if (data.success && data.data) {
        const boardConfig = WorkflowConfigService.loadWithMetadata(boardId);
        const boardWorkflow = boardConfig?.workflow || DEFAULT_WORKFLOW;
        const processedIssues = data.data?.issues.map(issue => {
          const issueWithChangelog = issue as any;
          const changelog = issueWithChangelog.changelog;
          return processJiraIssue(boardWorkflow, issue, changelog);
        });

        const flowResult = {
          success: true,
          data: {
            issues: processedIssues,
            workflow: boardWorkflow
          }
        }
        WorkflowConfigService.save(boardId, boardWorkflow, boardConfig?.metadata.boardName, boardConfig?.metadata.boardType, processedIssues);
        setResult(flowResult);
      }

    } catch (error) {
      setResult({
        success: false,
        error: "Failed to fetch flow metrics"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!boardConfig) {
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
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-blue-600">Boards</Link>
            <span>/</span>
            <span className="text-gray-900">{boardConfig.boardName || `Board ${boardId}`}</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {boardConfig.boardName || `Board ${boardId}`}
              </h1>
              <p className="text-gray-600 mt-1">
                Using workflow: <span className="font-medium">{boardConfig.workflowName}</span>
              </p>
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
          <h2 className="text-lg font-semibold mb-4">Analysis Period</h2>

          <div className="flex space-x-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Period (days):
              </label>
              <input
                type="number"
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                placeholder="30"
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={processIssuesWithWorkflow}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Analyze Flow'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Analyze issues updated in the last N days
          </p>
        </div>

        {/* Error Display */}
        {result && !result.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{result.error}</p>
          </div>
        )}

        {/* Results */}
        {result && result.success && result.data && (
          <>
            {/* Process health*/}
            <CollapsibleSection title="Aging Chart">
              <AgingScatterplot issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
            <CollapsibleSection title={`Cumulative Flow Diagram (Last ${periodDays} Days)`}>
              <CumulativeFlowDiagram issues={result.data.issues} workflow={result.data.workflow} periodDays={parseInt(periodDays)} />
            </CollapsibleSection>
            {/* Single-item forecast*/}
            <CollapsibleSection title={`Cycle Time Scatterplot (Last ${periodDays} Days)`}>
              <CycleTimeScatterplot issues={result.data.issues} periodDays={parseInt(periodDays)} />
            </CollapsibleSection>

            {/*Multi-item forecasts */}
            <CollapsibleSection title={`Forecast - Number of Items Completed`}>
              <MonteCarloHowManyChart issues={result.data.issues} periodDays={parseInt(periodDays)} />
            </CollapsibleSection>
            <CollapsibleSection title={`Forecast - Days Required to Complete Next X Items`}>
              <MonteCarloWhenChart issues={result.data.issues} periodDays={parseInt(periodDays)} />
            </CollapsibleSection>

            {/* Full issue list*/}
            <CollapsibleSection title="Issue List">
              <FlowIssueList issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
          </>
        )}

        {/* Empty State */}
        {!result && (
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
              Set the analysis period above and click "Analyze Flow" to see your metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}