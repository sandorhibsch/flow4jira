import { FlowIssueCalculatedMetrics, ProcessedFlowIssue } from "@/lib/flow/flow-types";
import { calculateSummary } from "@/lib/metrics/metrics-calculator";

const FlowIssueSummary = ({ issues }: { issues: ProcessedFlowIssue[] }) => {
  const calculatedMetrics: FlowIssueCalculatedMetrics = calculateSummary(issues);

  return (<>
    {/* Summary Stats */}
    {calculatedMetrics && (
      <div className="grid grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Issues</div>
          <div className="text-2xl font-bold">{calculatedMetrics.total}</div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">WIP</div>
          <div className="text-2xl font-bold text-blue-600">{calculatedMetrics.workInProgress}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Average Age</div>
          <div className="text-2xl font-bold text-purple-600">
            {calculatedMetrics.averageAge.toFixed(2)}d
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Avg Cycle Time</div>
          <div className="text-2xl font-bold text-orange-600">
            {calculatedMetrics.averageCycletime.toFixed(2)}d
          </div>
        </div>
      </div>
    )}
  </>)
};

export default FlowIssueSummary;