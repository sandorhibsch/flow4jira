import type { ProcessedFlowIssue } from '../flow/flow-types';
import type { WorkflowDefinition, WorkflowStage } from '../jira/workflow-config';
import { buildAgingScatterplotModel, calculateCycleAge } from './aging-scatterplot-model';

const backlog: WorkflowStage = { key: 'backlog', name: 'Backlog', jiraStatuses: [], stageType: 'new' };
const doing: WorkflowStage = { key: 'doing', name: 'Doing', jiraStatuses: [], stageType: 'in-progress' };
const review: WorkflowStage = { key: 'review', name: 'Review', jiraStatuses: [], stageType: 'in-progress' };
const done: WorkflowStage = { key: 'done', name: 'Done', jiraStatuses: [], stageType: 'done' };
const workflow: WorkflowDefinition = { key: 'flow', name: 'Flow', stages: [backlog, doing, review, done] };
const now = new Date('2026-08-31T12:00:00.000Z');

function issue(overrides: Partial<ProcessedFlowIssue>): ProcessedFlowIssue {
  return {
    key: 'FLOW-1', summary: 'Work', issueType: 'Story', created: new Date(),
    flowHistory: [], currentStage: backlog, currentStatus: 'Backlog',
    leadTimeDays: 0, cycleTimeDays: 0, ageDays: 10,
    ...overrides,
  };
}

describe('aging scatterplot model', () => {
  it('filters completed and unknown stages and orders points by workflow stage', () => {
    const model = buildAgingScatterplotModel([
      issue({ key: 'REVIEW', currentStage: review, ageDays: 3 }),
      issue({ key: 'DONE', currentStage: done, ageDays: 1 }),
      issue({ key: 'DOING', currentStage: doing, ageDays: 8 }),
      issue({ key: 'UNKNOWN', currentStage: { ...doing, key: 'other' }, ageDays: 5 }),
    ], workflow, 'total', now);

    expect(model.points.map(point => [point.key, point.x, point.y])).toEqual([
      ['DOING', 'Doing', 8],
      ['REVIEW', 'Review', 3],
    ]);
  });

  it('shows only in-progress issues with an actual cycle start in cycle mode', () => {
    const model = buildAgingScatterplotModel([
      issue({ key: 'BACKLOG', currentStage: backlog }),
      issue({ key: 'NO-START', currentStage: doing }),
      issue({
        key: 'ACTIVE', currentStage: doing,
        flowHistory: [{ stage: doing, jiraStatus: 'Doing', enteredAt: new Date('2026-08-29T18:00:00.000Z'), isActualCycleStart: true }],
      }),
    ], workflow, 'cycle', now);

    expect(model.points.map(point => ({ key: point.key, age: point.y }))).toEqual([{ key: 'ACTIVE', age: 2 }]);
  });

  it('never reports a negative age for a future cycle timestamp', () => {
    const futureIssue = issue({
      currentStage: doing,
      flowHistory: [{ stage: doing, jiraStatus: 'Doing', enteredAt: new Date('2026-09-01T12:00:00.000Z'), isActualCycleStart: true }],
    });

    expect(calculateCycleAge(futureIssue, now)).toBe(-1);
    expect(buildAgingScatterplotModel([futureIssue], workflow, 'cycle', now).points[0]?.y).toBe(0);
  });

  it('builds a sorted deterministic legend using known and fallback colors', () => {
    const model = buildAgingScatterplotModel([
      issue({ key: 'Z', currentStage: doing, issueType: 'Zebra' }),
      issue({ key: 'S', currentStage: doing, issueType: 'Story' }),
      issue({ key: 'A', currentStage: review, issueType: 'Alpha' }),
    ], workflow, 'total', now);

    expect(model.issueTypes).toEqual(['Alpha', 'Story', 'Zebra']);
    expect(model.colorMap.get('Story')).toBe('#4e79a7');
    expect(model.colorMap.get('Alpha')).toBeDefined();
    expect(model.colorMap.get('Zebra')).toBeDefined();
  });
});
