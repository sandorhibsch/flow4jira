'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BoardConfig, BoardConfigMetadata } from '@/lib/repositories';
import { boardConfigClient } from '@/lib/api/board-config.client';

export default function HomePage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<BoardConfigMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await boardConfigClient.listAll();

    if (result.success) {
      setConfigs(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleDelete = async (boardId: string, boardName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the configuration for ${boardName ?? `Board ${boardId}`}?`
    );

    if (confirmed) {
      const result = await boardConfigClient.delete(boardId);
      if (result.success) {
        loadConfigs(); // Refresh list
      } else {
        alert('Failed to delete configuration');
      }
    }
  };

  const handleCreateNew = () => {
    const boardId = prompt('Enter Board ID to configure:');
    if (boardId?.trim()) {
      router.push(`/boards/${boardId.trim()}/configure`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-gray-500">Loading boards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={loadConfigs}
              className="mt-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Flow4Jira™ - Your Boards</h1>
          <button
            onClick={handleCreateNew}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            + Configure New Board
          </button>
        </div>

        {configs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards configured yet</h3>
            <p className="text-gray-500 mb-6">
              Configure your first board to start tracking flow metrics
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
            >
              Configure Your First Board
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <BoardCard
                key={config.boardId}
                config={config}
                onDelete={() => handleDelete(config.boardId, config.boardName)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Board Card Component - displays a single board config
 */
interface BoardCardProps {
  config: BoardConfigMetadata;
  onDelete: () => void;
}

function BoardCard({ config, onDelete }: BoardCardProps) {
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