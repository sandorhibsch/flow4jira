import type { WorkflowStage } from './workflow-config';
import {
  appendWorkflowStage,
  assignStatusToStage,
  buildWorkflowDefinition,
  createInitialWorkflowStage,
  removeStatusFromStage,
  removeWorkflowStage,
  updateWorkflowStage,
  validateWorkflowDraft,
} from './workflow-editor';

const start: WorkflowStage = {
  key: 'doing', name: 'Doing', jiraStatuses: ['In Progress'], stageType: 'in-progress', isCycleStart: true,
};
const end: WorkflowStage = {
  key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done', isCycleEnd: true,
};

describe('workflow editor', () => {
  it('creates the initial backlog and appends a predictably styled stage', () => {
    const initial = [createInitialWorkflowStage()];

    const stages = appendWorkflowStage(initial);

    expect(stages).toEqual([
      { key: 'backlog', name: 'Backlog', jiraStatuses: [], stageType: 'new', color: '#bab0ac' },
      { key: 'stage2', name: 'Stage 2', jiraStatuses: [], stageType: 'in-progress', color: '#9c755f' },
    ]);
    expect(initial).toHaveLength(1);
  });

  it('does not remove the last stage', () => {
    expect(removeWorkflowStage([start], 0)).toEqual({
      success: false,
      error: 'Must have at least one stage',
    });
  });

  it('updates and removes stages without mutating the input', () => {
    const original = [start, end];
    const updated = updateWorkflowStage(original, 0, { name: 'Development' });
    const removed = removeWorkflowStage(updated, 1);

    expect(updated[0]?.name).toBe('Development');
    expect(original[0]?.name).toBe('Doing');
    expect(removed).toEqual({ success: true, stages: [expect.objectContaining({ name: 'Development' })] });
  });

  it('normalizes, de-duplicates, and removes status assignments', () => {
    const assigned = assignStatusToStage([start], 0, '  Review  ');
    const duplicate = assignStatusToStage(assigned, 0, 'Review');
    const removed = removeStatusFromStage(duplicate, 0, 'In Progress');

    expect(assigned[0]?.jiraStatuses).toEqual(['In Progress', 'Review']);
    expect(duplicate).toBe(assigned);
    expect(removed[0]?.jiraStatuses).toEqual(['Review']);
    expect(start.jiraStatuses).toEqual(['In Progress']);
  });

  it.each([
    [{ name: ' ', periodDays: 30, stages: [start, end], boardType: 'kanban' }, 'Workflow name is required'],
    [{ name: 'Flow', periodDays: 0, stages: [start, end], boardType: 'kanban' }, 'Default period is required'],
    [{ name: 'Flow', periodDays: 30, stages: [], boardType: 'kanban' }, 'At least one stage is required'],
    [{ name: 'Flow', periodDays: 30, stages: [{ ...start, jiraStatuses: [] }, end], boardType: 'kanban' }, 'Some stages have no statuses: Doing'],
    [{ name: 'Flow', periodDays: 30, stages: [{ ...start, isCycleStart: false }, end], boardType: 'kanban' }, 'At least one stage must be marked as cycle start'],
    [{ name: 'Flow', periodDays: 30, stages: [start, { ...end, isCycleEnd: false }], boardType: 'kanban' }, 'At least one stage must be marked as cycle end'],
  ])('returns the first actionable validation error %#', (draft, error) => {
    expect(validateWorkflowDraft(draft)).toBe(error);
  });

  it('allows unmapped Scrum stages and accepts a complete draft', () => {
    expect(validateWorkflowDraft({
      name: 'Sprint flow', periodDays: 30,
      stages: [{ ...start, jiraStatuses: [] }, { ...end, jiraStatuses: [] }],
      boardType: 'scrum',
    })).toBeNull();
  });

  it('builds a board-scoped workflow without sharing mutable status arrays', () => {
    const workflow = buildWorkflowDefinition('42', 'Delivery', [start, end]);

    expect(workflow).toEqual({ key: 'board-42', name: 'Delivery', stages: [start, end] });
    expect(workflow.stages).not.toBe([start, end]);
    expect(workflow.stages[0]?.jiraStatuses).not.toBe(start.jiraStatuses);
  });
});
