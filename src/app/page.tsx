'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClientConfigWrapper } from './ClientConfigWrapper';
import { BoardConfigLocalRepository } from '@/lib/repositories/board-config.local.repository';
import { BoardConfigMetadata } from '@/lib/repositories/board-config.types';
import { BoardCard } from '@/components/ui/board-card';
import { PromptDialog, ConfirmDialog } from '@/components/ui/dialog';

export default function HomePage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<BoardConfigMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [promptOpen, setPromptOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ boardId: string; boardName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useCallback((element: HTMLInputElement | null) => {
    // We'll use this to trigger the file input
  }, []);

  const localStorageRepository = new BoardConfigLocalRepository();
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await localStorageRepository.listAll();
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && !(event.target as Element).closest('.menu-container')) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleDelete = (boardId: string, boardName?: string) => {
    setDeleteTarget({ boardId, boardName });
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      const result = await localStorageRepository.delete(deleteTarget.boardId);
      if (result.success) {
        loadConfigs(); // Refresh list
      } else {
        alert('Failed to delete configuration');
      }
    }
    setConfirmOpen(false);
    setDeleteTarget(null);
  };

  const handleCreateNew = () => {
    setPromptOpen(true);
  };

  const submitBoardId = (boardId: string) => {
    setPromptOpen(false);
    router.push(`/boards/${boardId}/configure`);
  };

  const handleExport = async (boardId: string, boardName: string) => {
    const result = await localStorageRepository.exportConfig(boardId);
    if (result.success) {
      const dataStr = JSON.stringify(result.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${boardName}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert('Failed to export configuration: ' + result.error);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileContent = await file.text();
      const importData = JSON.parse(fileContent);

      const result = await localStorageRepository.importConfig(importData);
      if (result.success) {
        setImportSuccess(
          `Successfully imported board: ${result.data.metadata.boardName || result.data.metadata.boardId}`
        );
        loadConfigs(); // Refresh the list

        // Clear success message after 3 seconds
        setTimeout(() => setImportSuccess(null), 3000);
      } else {
        setError(`Import failed: ${result.error}`);
      }
    } catch (err) {
      setError(
        `Failed to import configuration: ${err instanceof Error ? err.message : 'Invalid JSON file'}`
      );
    }

    // Reset file input
    event.target.value = '';
  };

  const triggerFileInput = () => {
    const input = document.getElementById('import-file-input') as HTMLInputElement;
    input?.click();
  };

  if (loading) {
    return (
      <ClientConfigWrapper>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-500">Loading boards...</p>
          </div>
        </div>
      </ClientConfigWrapper>
    );
  }

  if (error) {
    return (
      <ClientConfigWrapper>
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
      </ClientConfigWrapper>
    );
  }

  return (
    <ClientConfigWrapper>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Flow4Jira - Your Boards</h1>
            <div className="relative menu-container">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                ...
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                  <button
                    onClick={() => { handleCreateNew(); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Configure New Board
                  </button>
                  <button
                    onClick={() => { triggerFileInput(); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Import Board Config
                  </button>
                  <button
                    onClick={() => { router.push('/jira-config'); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit Jira Config
                  </button>
                  <button
                    onClick={() => { router.push('/info'); setMenuOpen(false); }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    About
                  </button>

                </div>
              )}
            </div>
          </div>

          {importSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <h3 className="text-green-800 font-medium">Success</h3>
              <p className="text-green-700 text-sm">{importSuccess}</p>
            </div>
          )}

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
                Configure your first board to start tracking flow metrics or import an existing configuration
              </p>
              <div className="relative flex justify-center menu-container">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  +
                </button>
                {menuOpen && (
                  <div className="absolute mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => { handleCreateNew(); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Configure New Board
                    </button>
                    <button
                      onClick={() => { triggerFileInput(); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Import Board Config
                    </button>
                    <button
                      onClick={() => { router.push('/jira-config'); setMenuOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit Jira Config
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {configs.map((config) => (
                <BoardCard
                  key={config.boardId}
                  config={config}
                  onDelete={() => handleDelete(config.boardId, config.boardName)}
                  onExport={() => handleExport(config.boardId, config.boardName ? config.boardName : config.boardId)}
                />
              ))}
            </div>
          )}
        </div>
        {/* Dialogs */}
        <PromptDialog
          isOpen={promptOpen}
          title="Configure New Board"
          message="Enter Board ID to configure:"
          placeholder="e.g. 123"
          onSubmit={submitBoardId}
          onCancel={() => setPromptOpen(false)}
        />

        <ConfirmDialog
          isOpen={confirmOpen}
          title="Delete Board Configuration"
          message={`Are you sure you want to delete the configuration for ${deleteTarget?.boardName || `Board ${deleteTarget?.boardId}`}?`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setDeleteTarget(null);
          }}
        />
        <input
          id="import-file-input"
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
          ref={fileInputRef}
        />
      </div>
    </ClientConfigWrapper>
  );
}