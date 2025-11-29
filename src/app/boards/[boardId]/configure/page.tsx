'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { WorkflowDefinition, WorkflowStage } from '@/lib/jira/workflow-config';
import { WorkflowConfigService } from '@/lib/services/workflow-config-service';

type BoardInfo = {
  id: string;
  name: string;
  type: string;
  periodDays: string;
};

type FetchBoardResult = {
  success: boolean;
  data?: {
    board: BoardInfo;
    statuses: string[];
    columns: any[];
  };
  error?: string;
};

const STAGE_COLORS = [
  '#bab0ac', // gray
  '#4e79a7', // blue
  '#9c755f', // brown
  '#f28e2b', // orange
  '#edc948', // yellow
  '#76b7b2', // teal
  '#e15759', // red
  '#59a14f', // green
];

export default function ConfigurePage() {
  const params = useParams();
  const router = useRouter();
  const boardIdFromUrl = params?.boardId as string | undefined;

  const [boardId, setBoardId] = useState(boardIdFromUrl || '');
  const [loading, setLoading] = useState(false);
  const [boardInfo, setBoardInfo] = useState<BoardInfo | null>(null);
  const [boardColumns, setBoardColumns] = useState<Array<{ name: string; statusCount: number }>>([]);

  // Workflow state
  const [workflowName, setWorkflowName] = useState('');
  const [periodDays, setPeriodDays] = useState('');
  const [stages, setStages] = useState<WorkflowStage[]>([
    {
      key: 'backlog',
      name: 'Backlog',
      jiraStatuses: [],
      stageType: 'new',
      color: STAGE_COLORS[0],
    },
  ]);

  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-load board if boardId is in URL
  useEffect(() => {
    if (boardIdFromUrl) {
      fetchBoardInfo();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBoardInfo = async () => {
    if (!boardId) {
      alert('Please enter a Board ID');
      return;
    }

    setLoading(true);
    setSaveStatus(null);

    try {
      const workflowConfig = WorkflowConfigService.loadWithMetadata(boardId);
      if (workflowConfig) {
        setWorkflowName(workflowConfig.workflow.name);
        setPeriodDays(workflowConfig.metadata.periodDays);

        const boardInfo: BoardInfo = {
          id: workflowConfig.metadata.boardId,
          name: workflowConfig.metadata.boardName || 'Workflow',
          type: workflowConfig.metadata.boardType || 'unknown',
          periodDays: workflowConfig.metadata.periodDays
        }

        setBoardInfo(boardInfo);

        setStages(workflowConfig.workflow.stages);
        setSaveStatus({ type: 'success', message: 'Loaded existing configuration' });
      } else {

        const response = await fetch(`/api/jira/board?boardId=${encodeURIComponent(boardId)}`);
        const data: FetchBoardResult = await response.json();

        if (!data.success) {
          alert(`Error: ${data.error}`);
          return;
        }

        setBoardInfo(data.data!.board);
        setWorkflowName(`${data.data!.board.name} Workflow`);
        setPeriodDays(data.data!.board.periodDays);

      }
    } catch (error) {
      alert('Failed to fetch board information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addStage = () => {
    const stageNumber = stages.length + 1;
    const newStage: WorkflowStage = {
      key: `stage${stageNumber}`,
      name: `Stage ${stageNumber}`,
      jiraStatuses: [],
      stageType: 'in-progress',
      color: STAGE_COLORS[stageNumber % STAGE_COLORS.length],
    };
    setStages([...stages, newStage]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) {
      alert('Must have at least one stage');
      return;
    }
    setStages(stages.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, updates: Partial<WorkflowStage>) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], ...updates };
    setStages(newStages);
  };

  const addStatusToStage = (stageIndex: number, statusName: string) => {
    if (!statusName.trim()) return;

    const stage = stages[stageIndex];
    if (stage.jiraStatuses.includes(statusName)) return; // Already exists

    updateStage(stageIndex, {
      jiraStatuses: [...stage.jiraStatuses, statusName]
    });
  };

  const removeStatusFromStage = (stageIndex: number, statusName: string) => {
    const stage = stages[stageIndex];
    updateStage(stageIndex, {
      jiraStatuses: stage.jiraStatuses.filter(s => s !== statusName)
    });
  };

  const validateWorkflow = (): string | null => {
    if (!workflowName.trim()) {
      return 'Workflow name is required';
    }

    if (!periodDays) {
      return 'Default period is required';
    }

    if (stages.length === 0) {
      return 'At least one stage is required';
    }

    // Check that stages have statuses except with Scrum board
    const stagesWithoutStatuses = stages.filter(s => s.jiraStatuses.length === 0);
    if (stagesWithoutStatuses.length > 0 && boardInfo?.type != 'scrum') {
      return `Some stages have no statuses: ${stagesWithoutStatuses.map(s => s.name).join(', ')}`;
    }

    // Check for cycle start
    const hasCycleStart = stages.some(s => s.isCycleStart);
    if (!hasCycleStart) {
      return 'At least one stage must be marked as cycle start';
    }

    // Check for cycle end
    const hasCycleEnd = stages.some(s => s.isCycleEnd);
    if (!hasCycleEnd) {
      return 'At least one stage must be marked as cycle end';
    }

    return null;
  };

  const saveWorkflow = async () => {
    const validationError = validateWorkflow();
    if (validationError) {
      alert(validationError);
      return;
    }

    const workflow: WorkflowDefinition = {
      key: `board-${boardId}`,
      name: workflowName,
      stages: stages,
    };

    const success = WorkflowConfigService.save(boardId, periodDays, workflow, boardInfo?.name, boardInfo?.type, []);

    if (success) {
      setSaveStatus({ type: 'success', message: 'Workflow saved successfully!' });

      // Redirect to board metrics after 1 second
      setTimeout(() => {
        router.push(`/boards/${boardId}`);
      }, 1000);
    } else {
      setSaveStatus({ type: 'error', message: 'Failed to save workflow' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-blue-600">Boards</Link>
            {boardIdFromUrl && (
              <>
                <span>/</span>
                <Link href={`/boards/${boardIdFromUrl}`} className="hover:text-blue-600">
                  {boardInfo?.name || `Board ${boardIdFromUrl}`}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900">Configure</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Configure Workflow
          </h1>
        </div>

        {/* Board Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. Select Board</h2>

          <div className="flex space-x-2">
            <input
              type="text"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              placeholder="Enter Board ID (e.g., 123)"
              disabled={!!boardIdFromUrl} // Disable if coming from URL
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              onClick={fetchBoardInfo}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Board'}
            </button>
          </div>

          {boardInfo && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
              <p className="font-medium text-green-800">
                Board: {boardInfo.name} (ID: {boardInfo.id})
              </p>
              {boardColumns.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-green-700 font-medium">Board Columns:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {boardColumns.map((col, idx) => (
                      <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {col.name} ({col.statusCount} {col.statusCount === 1 ? 'status' : 'statuses'})
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    💡 Use these column names as a guide when adding statuses to your workflow stages below
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflow Builder */}
        {boardInfo && (
          <>
            {/* Workflow Name */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">2. Name Your Workflow</h2>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Workflow Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/*Default period */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">3. Specify analysis period (days):</h2>
              <input
                type="text"
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                placeholder="Analysis period"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Stages Configuration */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">4. Configure Stages</h2>
              </div>

              <div className="space-y-6">
                {stages.map((stage, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {/* Stage Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage Name
                        </label>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateStage(index, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Stage Key */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage Key (unique identifier)
                        </label>
                        <input
                          type="text"
                          value={stage.key}
                          onChange={(e) => updateStage(index, { key: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>

                      {/* Stage Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stage Type
                        </label>
                        <select
                          value={stage.stageType}
                          onChange={(e) => updateStage(index, { stageType: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="new">New (Backlog)</option>
                          <option value="ready">Ready</option>
                          <option value="in-progress">In Progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>

                      {/* Color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Color
                        </label>
                        <input
                          type="color"
                          value={stage.color || STAGE_COLORS[0]}
                          onChange={(e) => updateStage(index, { color: e.target.value })}
                          className="w-full h-10 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    {/* Cycle Markers */}
                    <div className="flex space-x-4 mb-4">
                      {boardInfo.type === 'scrum' && (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={stage.isAddedToSprint || false}
                            onChange={(e) => updateStage(index, { isAddedToSprint: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Added to Sprint</span>
                        </label>
                      )}
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={stage.isCycleStart || false}
                          onChange={(e) => updateStage(index, { isCycleStart: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Cycle Start</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={stage.isCycleEnd || false}
                          onChange={(e) => updateStage(index, { isCycleEnd: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Cycle End</span>
                      </label>

                    </div>

                    {/* Status Management */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jira Statuses
                      </label>

                      {/* Current Statuses */}
                      {stage.jiraStatuses.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {stage.jiraStatuses.map((status) => (
                            <span
                              key={status}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                            >
                              {status}
                              <button
                                onClick={() => removeStatusFromStage(index, status)}
                                className="ml-2 text-blue-600 hover:text-blue-800 font-bold"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Add Status Input */}
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Enter status name (e.g., 'In Progress')"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.currentTarget;
                              addStatusToStage(index, input.value);
                              input.value = '';
                            }
                          }}
                        />
                        <button
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            addStatusToStage(index, input.value);
                            input.value = '';
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          Add
                        </button>
                      </div>

                      <p className="text-xs text-gray-500 mt-2">
                        Add status names exactly as they appear in Jira (case-sensitive)
                      </p>
                      {boardInfo.type != 'scrum' && stage.jiraStatuses.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ At least one status is required
                        </p>
                      )}
                    </div>

                    {/* Remove Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => removeStage(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove Stage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addStage}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                + Add Stage
              </button>
            </div>

            {/* Save Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">5. Save Configuration</h2>

              {saveStatus && (
                <div className={`mb-4 p-4 rounded ${saveStatus.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                  {saveStatus.message}
                </div>
              )}

              <button
                onClick={saveWorkflow}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded text-lg"
              >
                Save Workflow Configuration
              </button>

              <div className="mt-4 text-sm text-gray-600">
                <p>This will save the workflow configuration to your browser's local storage.</p>
                {boardIdFromUrl && (
                  <p className="mt-2">
                    After saving, you'll be redirected to the board metrics page.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!boardInfo && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No board selected
            </h3>
            <p className="text-gray-500">
              Enter a Jira Board ID above to start configuring your workflow
            </p>
          </div>
        )}
      </div>
    </div>
  );
}