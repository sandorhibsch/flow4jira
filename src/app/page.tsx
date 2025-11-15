'use client';

import { useState } from 'react';
import { ProcessedFlowIssue, FlowIssueCalculatedMetrics } from '@/lib/flow/flow-types';
import { WorkflowDefinition } from '@/lib/jira/workflow-config';

import CollapsibleSection from '@/ui/collapsible-section';
import FlowIssueList from '@/ui/flow-issue-list';
import CycleTimeScatterplot from '@/ui/cycletime-scatterplot';
import AgingScatterplot from '@/ui/aging-scatterplot';
import CumulativeFlowDiagram from '@/ui/cumulative-flow-diagram';

type QueryMode = 'jql' | 'board';

type FlowResult = {
  success: boolean;
  data?: {
    issues: ProcessedFlowIssue[];
    workflow: WorkflowDefinition;
    summary: FlowIssueCalculatedMetrics;
  };
  error?: string;
};

export default function FlowDashboard() {
  const [queryMode, setQueryMode] = useState<QueryMode>('jql');

  // JQL inputs
  const [jql, setJql] = useState('');

  // Board inputs
  const [boardId, setBoardId] = useState('');
  const [periodDays, setPeriodDays] = useState('30');

  const [result, setResult] = useState<FlowResult>();
  const [loading, setLoading] = useState(false);

  const fetchFlowMetrics = async () => {
    // Validate inputs based on mode
    if (queryMode === 'jql' && !jql) {
      alert('Please enter a JQL query');
      return;
    }

    if (queryMode === 'board' && !boardId) {
      alert('Please enter a Board ID');
      return;
    }

    setLoading(true);

    try {
      let url: string;

      if (queryMode === 'jql') {
        url = `/api/flow/issues?jql=${encodeURIComponent(jql)}`;
      } else {
        url = `/api/flow/board?boardId=${encodeURIComponent(boardId)}&periodDays=${encodeURIComponent(periodDays)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({
        success: false,
        error: "Failed to fetch flow metrics"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="w-full h-96">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Flow4Jira™ - Flow Metrics Dashboard
        </h1>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {/* Mode Selector */}
          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setQueryMode('jql')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${queryMode === 'jql'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              JQL Query
            </button>
            <button
              onClick={() => setQueryMode('board')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${queryMode === 'board'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              Board ID
            </button>
          </div>

          {/* JQL Input Mode */}
          {queryMode === 'jql' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JQL Query:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={jql}
                  onChange={(e) => setJql(e.target.value)}
                  placeholder='e.g., project="PROJ" AND updated>=-30d'
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={fetchFlowMetrics}
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Analyze Flow'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter a JQL query to analyze flow metrics for those issues
              </p>
            </>
          )}

          {/* Board Input Mode */}
          {queryMode === 'board' && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Board ID:
                  </label>
                  <input
                    type="text"
                    value={boardId}
                    onChange={(e) => setBoardId(e.target.value)}
                    placeholder="e.g., 123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
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
              </div>
              <button
                onClick={fetchFlowMetrics}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50 mt-2"
              >
                {loading ? 'Loading...' : 'Analyze Flow'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Enter a board ID to analyze flow metrics for issues updated in the last N days
              </p>
            </>
          )}
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
            <CollapsibleSection title="Cycle Time Scatterplot (Last 60 Days)">
              <CycleTimeScatterplot issues={result.data.issues} />
            </CollapsibleSection>
            <CollapsibleSection title="Aging chart">
              <AgingScatterplot issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
            <CollapsibleSection title="Cumulative Flow Diagram">
              <CumulativeFlowDiagram issues={result.data.issues} workflow={result.data.workflow} />
            </CollapsibleSection>
            <CollapsibleSection title="Issue list">
              <FlowIssueList issues={result.data.issues} />
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
              No flow metrics yet
            </h3>
            <p className="text-gray-500">
              {queryMode === 'jql'
                ? 'Enter a JQL query above to analyze your team\'s flow metrics'
                : 'Enter a board ID above to analyze your team\'s flow metrics'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}