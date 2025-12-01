import { issueTableColumns } from "@/components/ui/issue-table-columns"
import { ProcessedFlowIssue } from "@/lib/flow/flow-types"
import { DataTable } from "./issue-table";
import { WorkflowDefinition, WorkflowStage } from "@/lib/jira/workflow-config";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import FlowIssueSummary from "./flow-issue-summary";

const FlowIssueTable = ({
  issues,
  workflow
}: {
  issues: ProcessedFlowIssue[],
  workflow: WorkflowDefinition
}) => {

  const workflowColumns: ColumnDef<ProcessedFlowIssue>[] = workflow.stages.map((stage) => {
    return {
      accessorKey: stage.key,
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase"
          >
            {stage.name}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const history = row.getValue("flowHistory") as ([{ stage: WorkflowStage, enteredAt: Date }]);
        const enteredAt = history.find(item => item.stage.key === stage.key)?.enteredAt;
        return (
          <span className="text-sm text-gray-500">{enteredAt ? format(new Date(enteredAt), "d MMM yyyy hh:mm") : ''}</span>
        )
      }
    }
  })

  const columns: ColumnDef<ProcessedFlowIssue>[] = [
    ...issueTableColumns,
    ...workflowColumns];

  return (
    <div className="space-y-6">
      <FlowIssueSummary issues={issues} />
      <DataTable columns={columns} data={issues} />
    </div>
  )
}

export default FlowIssueTable;