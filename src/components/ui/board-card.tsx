import { BoardConfigMetadata } from "@/lib/repositories/board-config.types";
import Link from "next/link";

export interface BoardCardProps {
  config: BoardConfigMetadata;
  onDelete: () => void;
}
export function BoardCard({ config, onDelete }: BoardCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {config.boardName ?? `Board ${config.boardId}`}
          </h2>
          <p className="text-sm text-gray-600 mb-1">
            Period: <span className="font-medium">{config.periodDays} days</span>
          </p>
          <p className="text-sm text-gray-500">
            {config.boardType && `${config.boardType} • `}
            Last modified: {new Date(config.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex flex-col space-y-2 ml-4">
          <Link
            href={`/boards/${config.boardId}`}
            className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center text-sm"
          >
            View Metrics
          </Link>
          <Link
            href={`/boards/${config.boardId}/configure`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded text-center text-sm"
          >
            Edit Config
          </Link>
          <button
            onClick={onDelete}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>


    </div>
  );
}