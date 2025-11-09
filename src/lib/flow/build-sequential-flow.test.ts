import { JiraIssue } from "../jira/jira-types";
import { WorkflowDefinition } from "../jira/workflow-config";
import { buildSequentialFlow, SequentialStageEntry } from "./build-sequential-flow";
import { StatusChange } from "./history-builder";

const TEST_WORKFLOW: WorkflowDefinition = {
  key: 'default',
  name: 'Full Development Workflow',
  stages: [
    { key: 'backlog', name: 'Backlog', jiraStatuses: ['New', 'Backlog'], stageType: 'new' },
    { key: 'ready', name: 'Ready', jiraStatuses: ['To Do'], stageType: 'ready' },
    { key: 'dev', name: 'Development', jiraStatuses: ['In Progress'], stageType: 'in-progress', isCycleStart: true },
    { key: 'deploy', name: 'Deployment', jiraStatuses: ['Deployed'], stageType: 'in-progress' },
    { key: 'test', name: 'Testing', jiraStatuses: ['Test'], stageType: 'in-progress' },
    { key: 'release', name: 'Release', jiraStatuses: ['To be Released'], stageType: 'in-progress' },
    { key: 'done', name: 'Done', jiraStatuses: ['Done'], stageType: 'done', isCycleEnd: true },
  ],
};

describe('Sequential flow test', () => {
  it('should return new stage for issue without changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const emptyChanges: StatusChange[] = [];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, emptyChanges);

    expect(result.length).toBe(1);
    expect(result[0].enteredAt).toBe(createdDate);
    expect(result[0].stage).toBe(TEST_WORKFLOW.stages[0]);
  });

  it('should return all stage changes including backlog', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00') },
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'backlog'));
    expect(result[1].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'ready'));
    expect(result[2].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[3].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'done'));
  });

  it('should only count first occurrence of stage changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const firstToDoDate = new Date('2025-01-10T10:00:00');
    const firstDevDate = new Date('2025-01-12T09:43:00');
    const statusChanges: StatusChange[] = [
      { to: 'In Progress', enteredAt: new Date(firstDevDate.getTime() + (2 * 1000 * 60 * 60 * 24)) },
      { to: 'To Do', enteredAt: firstToDoDate },
      { to: 'In Progress', enteredAt: firstDevDate },
      { to: 'To Do', enteredAt: new Date(firstToDoDate.getTime() + (2 * 1000 * 60 * 60 * 24)) },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0].enteredAt).toStrictEqual(createdDate);
    expect(result[1].enteredAt).toStrictEqual(firstToDoDate);
    expect(result[2].enteredAt).toStrictEqual(firstDevDate);
    expect(result[3].enteredAt).toStrictEqual(new Date('2025-01-18T11:12:00'));
  });

  it('should count addition to sprint as stage change to ready', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'Sprint 1', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true },
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[1].stage.stageType).toBe('ready');
  });

  it('should return stage changes in workflow order', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'backlog'));
    expect(result[1].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'ready'));
    expect(result[2].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[3].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'done'));
  });

  it('should find actual cycle start when default', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00') },
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(5);
    expect(result[2].stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[2].isActualCycleStart).toBe(true);
  });

  it('should find actual cycle start when went from to do to testing', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00') },
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[1].isActualCycleStart).toBe(true);
  });

  it('should find actual cycle start when went from new to testing', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(3);
    expect(result[0].isActualCycleStart).toBe(true);
  });

  it('should count addition to sprint as stage change to ready', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'Sprint 1', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true },
      { to: 'Test', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[1].stage.stageType).toBe('ready');
    expect(result[1].isActualCycleStart).toBe(true);
    expect(result[0].isActualCycleStart).toBe(undefined);
  });

});