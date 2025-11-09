// src/ui/flow-issue-list.tsx

import { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import { FlowIssueSummary } from '@/lib/flow/flow-types';

type FlowIssueListProps = {
  issues: ProcessedFlowIssue[];
  summary?: FlowIssueSummary;
};

const FlowIssueList = ({ issues, summary }: FlowIssueListProps) => {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'backlog': return 'bg-gray-400';
      case 'analyze': return 'bg-blue-400';
      case 'ready': return 'bg-blue-800';
      case 'development': return 'bg-yellow-400';
      case 'deployment': return 'bg-orange-400';
      case 'testing': return 'bg-purple-400';
      case 'done': return 'bg-green-400';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Issues</div>
            <div className="text-2xl font-bold">{summary.total}</div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">WIP</div>
            <div className="text-2xl font-bold text-blue-600">{summary.workInProgress}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Average Age</div>
            <div className="text-2xl font-bold text-purple-600">
              {summary.averageAge.toFixed(2)}d
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Avg Cycle Time</div>
            <div className="text-2xl font-bold text-orange-600">
              {summary.averageCycletime.toFixed(2)}d
            </div>
          </div>
        </div>
      )}

      {/* Issues Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Age
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Lead Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cycle Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`w-3 h-3 rounded-full ${getStageColor(issue.currentStage.name)}`} title={issue.currentStage.name} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600">{issue.key}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{issue.issueType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {issue.summary}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{issue.currentStatus}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{issue.ageDays}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{issue.leadTimeDays}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{issue.cycleTimeDays}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlowIssueList;