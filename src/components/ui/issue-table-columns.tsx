import { ColumnDef } from "@tanstack/react-table";
import { ProcessedFlowIssue } from "@/lib/flow/flow-types";
import { ArrowUpDown } from "lucide-react";
import { Button } from "./button";

export const issueTableColumns: ColumnDef<ProcessedFlowIssue>[] = [
  {
    accessorKey: 'currentStage.name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase"
        >
          Stage
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const stage = row.getValue("currentStage") as { color?: string; name: string };
      return (
        <div className="px-2 py-3 whitespace-nowrap">
          <div className="p-1 text-center text-gray-50 font-bold rounded-md text-xs" style={{ backgroundColor: stage.color || '#6b7280' }} title={stage.name}>{stage.name}</div>
        </div>
      )
    }
  },
  {
    accessorKey: 'key',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase"
        >
          Key
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm font-medium text-blue-600">
          <a href={row.getValue("url") ? row.getValue("url") : ''} target='_blank'>{row.getValue("key")}</a>
        </span>
      )
    }
  },
  {
    accessorKey: 'issueType',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase"
        >
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    }
  },
  {
    accessorKey: 'summary',
    header: 'Summary',
    cell: ({ row }) => {
      return (
        <div className="text-sm text-left text-gray-900 max-w-sm truncate" title={row.getValue("summary")}>
          {row.getValue("summary")}
        </div>
      )
    }
  },
  {
    accessorKey: 'currentStatus',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    }
  },
  {
    accessorKey: 'ageDays',
    header: 'Age',
    cell: ({ row }) => {
      const age = row.getValue("ageDays") as number;
      return (
        <span className="text-sm text-gray-900">{age === 0 ? '' : age}</span>
      )
    }
  },
  {
    accessorKey: 'leadTimeDays',
    header: 'Lead Time',
    cell: ({ row }) => {
      const leadtime = row.getValue("leadTimeDays") as number;
      return (
        <span className="text-sm text-gray-900">{leadtime === 0 ? '' : leadtime}</span>
      )
    }
  },
  {
    accessorKey: 'cycleTimeDays',
    header: 'Cycle Time',
    cell: ({ row }) => {
      const cycletime = row.getValue("cycleTimeDays") as number;
      return (
        <span className="text-sm text-gray-900">{cycletime === 0 ? '' : cycletime}</span>
      )
    }
  },
  {
    accessorKey: 'url',
    header: 'Url',
    enableHiding: true
  },
  {
    accessorKey: 'currentStage',
    header: 'currentStage',
    enableHiding: true
  },
  {
    accessorKey: 'flowHistory',
    header: 'flowHistory',
    enableHiding: true
  }
];