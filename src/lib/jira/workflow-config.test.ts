import type { WorkflowDefinition, WorkflowStage } from './workflow-config';
import {
  findStageByStatus,
  getBacklogStage,
  getDoneStage,
  getReadyStage,
  getWIPStages,
} from './workflow-config';

const stages: WorkflowStage[] = [
  { key: 'backlog', name: 'Backlog', jiraStatuses: ['Open'], stageType: 'new' },
  { key: 'ready', name: 'Ready', jiraStatuses: ['Selected'], stageType: 'ready' },
  { key: 'doing', name: 'Doing', jiraStatuses: ['In Progress'], stageType: 'in-progress' },
  { key: 'review', name: 'Review', jiraStatuses: ['Review'], stageType: 'in-progress' },
  { key: 'done', name: 'Done', jiraStatuses: ['Closed'], stageType: 'done' },
];

const workflow: WorkflowDefinition = { key: 'test', name: 'Test workflow', stages };

describe('workflow helpers', () => {
  it('finds the stage containing the exact Jira status', () => {
    expect(findStageByStatus(workflow, 'In Progress')).toBe(stages[2]);
  });

  it.each([undefined, null, '', 'Unknown'])('falls back to the first stage for status %s', (status) => {
    expect(findStageByStatus(workflow, status)).toBe(stages[0]);
  });

  it('rejects an empty workflow rather than returning an invalid stage', () => {
    const emptyWorkflow: WorkflowDefinition = { key: 'empty', name: 'Empty', stages: [] };
    expect(() => findStageByStatus(emptyWorkflow, 'Open')).toThrow('Workflow must have at least one stage');
  });

  it('selects the first stage for each singular stage type', () => {
    expect(getBacklogStage(workflow)).toBe(stages[0]);
    expect(getReadyStage(workflow)).toBe(stages[1]);
    expect(getDoneStage(workflow)).toBe(stages[4]);
  });

  it('returns every in-progress stage in workflow order', () => {
    expect(getWIPStages(workflow)).toEqual([stages[2], stages[3]]);
  });

  it('returns absent singular stages and an empty WIP collection', () => {
    const newOnly: WorkflowDefinition = { key: 'new', name: 'New only', stages: [stages[0]!] };
    expect(getReadyStage(newOnly)).toBeUndefined();
    expect(getDoneStage(newOnly)).toBeUndefined();
    expect(getWIPStages(newOnly)).toEqual([]);
  });
});
