'use client';

import { useEffect, useState } from 'react';
import { WorkflowConfigService, WorkflowConfigWithMetadata } from '@/lib/services/workflow-config-service';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<WorkflowConfigWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    try {
      const allConfigs = WorkflowConfigService.listAll();
      setConfigs(allConfigs);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (boardId: string, boardName?: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the configuration for ${boardName || `Board ${boardId}`}?`
    );

    if (confirmed) {
      const success = WorkflowConfigService.delete(boardId);
      if (success) {
        loadConfigs(); // Refresh list
      } else {
        alert('Failed to delete configuration');
      }
    }
  };

  const handleCreateNew = () => {
    const boardId = prompt('Enter Board ID to configure:');
    if (boardId && boardId.trim()) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Flow4Jira™ - Your Boards
          </h1>
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
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No boards configured yet
            </h3>
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
              <div
                key={config.metadata.boardId}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {config.metadata.boardName || `Board ${config.metadata.boardId}`}
                    </h2>
                    <p className="text-sm text-gray-600 mb-1">
                      Workflow: <span className="font-medium">{config.workflow.name}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {config.workflow.stages.length} stages •
                      Last modified: {new Date(config.metadata.lastModified).toLocaleDateString()}
                    </p>

                    {/* Stage Pills */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {config.workflow.stages.map((stage) => (
                        <span
                          key={stage.key}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: stage.color || '#6b7280' }}
                        >
                          {stage.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Link
                      href={`/boards/${config.metadata.boardId}`}
                      className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-center text-sm"
                    >
                      View Metrics
                    </Link>
                    <Link
                      href={`/boards/${config.metadata.boardId}/configure`}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded text-center text-sm"
                    >
                      Edit Config
                    </Link>
                    <button
                      onClick={() => handleDelete(config.metadata.boardId, config.metadata.boardName)}
                      className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2 px-4 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}