import { BoardConfigMetadata } from "@/lib/repositories/board-config.types";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export interface BoardCardProps {
  config: BoardConfigMetadata;
  onDelete: () => void;
  onExport: () => void;
}
export function BoardCard({ config, onDelete, onExport }: BoardCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleMenu = () => setMenuOpen((o) => !o);

  // close the menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuOpen && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            <Link
              href={`/boards/${config.boardId}`}
              className="hover:underline"
            >
              {config.boardName ?? `Board ${config.boardId}`}
            </Link>
          </h2>
          <p className="text-sm text-gray-600 mb-1">
            Period: <span className="font-medium">{config.periodDays} days</span>
          </p>
          <p className="text-sm text-gray-500">
            {config.boardType && `${config.boardType} • `}
            Last modified: {new Date(config.updatedAt).toLocaleDateString()}
          </p>
        </div>

        <div ref={containerRef} className="relative ml-4">
          <button
            onClick={toggleMenu}
            className="p-2 rounded-full hover:bg-gray-200 focus:outline-none"
            aria-label="Actions"
          >
            {/* ellipsis icon */}
            <svg
              className="h-5 w-5 text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
              <Link
                href={`/boards/${config.boardId}/configure`}
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
              >
                Edit Config
              </Link>
              <button
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  onExport();
                  setMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}