'use client';

import { useEffect, useState } from 'react';
import { BoardConfigWithMetadata } from '@/lib/services/workflow-config-service';

export default function BoardList() {
  const [configs, setConfigs] = useState<BoardConfigWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const { WorkflowConfigService } = await import('@/lib/services/workflow-config-service');
      const allConfigs = WorkflowConfigService.listAll();
      setConfigs(allConfigs);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading boards...</p>
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Configured Boards</h2>
        <p className="text-gray-500 mb-4">
          No boards configured yet. Configure a board to get started!
        </p>
        <a
          href="/configure"
          className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Configure Your First Board
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Configured Boards</h2>
      <div className="space-y-3">
        {configs.map((config) => (
          <div
            key={config.metadata.boardId}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {config.metadata.boardName || `Board ${config.metadata.boardId}`}
                </h3>
                <p className="text-sm text-gray-500">
                  Workflow: {config.workflow.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {config.workflow.stages.length} stages •
                  Last modified: {new Date(config.metadata.lastFetched).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-2">
                <a
                  href={`/?mode=board&boardId=${config.metadata.boardId}`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View Metrics
                </a>
                <span className="text-gray-300">|</span>
                <a
                  href={`/configure?boardId=${config.metadata.boardId}`}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Edit
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}