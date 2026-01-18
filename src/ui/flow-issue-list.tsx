import type { ProcessedFlowIssue } from '@/lib/flow/flow-types';
import FlowIssueSummary from './flow-issue-summary';
import type { WorkflowDefinition } from '@/lib/jira/workflow-config';

import { format } from 'date-fns';

const FlowIssueList = ({
  issues,
  workflow }: {
    issues: ProcessedFlowIssue[],
    workflow: WorkflowDefinition
  }) => {


  return (
    <div className="space-y-6">
      <FlowIssueSummary issues={issues} />

      {/* Issues Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr key="issueListHeader">
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
                {workflow.stages.map((stage) => (
                  <th key={stage.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {stage.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: issue.currentStage.color || '#6b7280' }} title={issue.currentStage.name} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm font-medium text-blue-600"><a href={issue.url ? issue.url : ''} target='_blank'>{issue.key}</a></span>
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
                    <span className="text-sm text-gray-900">{issue.ageDays === 0 ? '' : issue.ageDays}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{issue.leadTimeDays === 0 ? '' : issue.leadTimeDays}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{issue.cycleTimeDays === 0 ? '' : issue.cycleTimeDays}</span>
                  </td>
                  {workflow.stages.map((stage) => (
                    <td key={`${issue.key}-${stage.key}`} className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{format(issue.flowHistory.find(item => item.stage.key === stage.key)?.enteredAt || new Date(), "d MMM yyyy hh:mm")}</span>
                    </td>
                  ))}

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