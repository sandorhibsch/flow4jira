// src/app/flow/page.tsx

'use client';
import { useState } from 'react';
import { ProcessedFlowIssue, FlowIssueSummary } from '@/lib/flow/flow-types';
import FlowIssueList from '@/ui/flow-issue-list';
import CollapsibleSection from '@/ui/collapsible-section';
import CycleTimeScatterplot from '@/ui/cycletime-scatterplot';
import { ResponsiveContainer } from 'recharts';

type FlowResult = {
  success: boolean;
  data?: {
    issues: ProcessedFlowIssue[];
    summary: FlowIssueSummary;
  };
  error?: string;
};

export default function FlowDashboard() {
  const [jql, setJql] = useState('');
  const [result, setResult] = useState<FlowResult>();
  const [loading, setLoading] = useState(false);

  const fetchFlowMetrics = async () => {
    if (!jql) {
      alert('Please enter a JQL query');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/flow/issues?jql=${encodeURIComponent(jql)}`, {
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
            <CollapsibleSection title="Issue list">
              <FlowIssueList
                issues={result.data.issues}
                summary={result.data.summary}
              />
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
              Enter a JQL query above to analyze your team's flow metrics
            </p>
          </div>
        )}
      </div>
    </div>
  );
}