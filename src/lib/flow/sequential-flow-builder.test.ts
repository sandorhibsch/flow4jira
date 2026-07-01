
import type { SequentialStageEntry } from "./sequential-flow-builder";
import { buildSequentialFlow } from "./sequential-flow-builder";
import type { StatusChange } from "./history-builder";
import { TEST_WORKFLOW } from "../testutils/create-mocks";
import { WorkflowDefinition } from "../jira/workflow-config";

describe('Sequential flow test', () => {

  it('should return new stage for issue without changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const emptyChanges: StatusChange[] = [];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, emptyChanges);

    expect(result.length).toBe(1);
    expect(result[0]?.enteredAt).toBe(createdDate);
    expect(result[0]?.stage).toBe(TEST_WORKFLOW.stages[0]);
  });

  it('should return all stage changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'In Progress', enteredAt: new Date('2025-01-10T09:43:00') },
      { to: 'Test', enteredAt: new Date('2025-01-12T10:00:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'backlog'));
    expect(result[1]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[2]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'test'));
    expect(result[3]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'done'));
  });

  it('should only count first occurrence of stage changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const firstDevDate = new Date('2025-01-10T10:00:00');
    const firstTestingDate = new Date('2025-01-12T09:43:00');
    const doneDate = new Date('2025-01-18T11:12:00')
    const statusChanges: StatusChange[] = [
      { to: 'In Progress', enteredAt: firstDevDate },
      { to: 'Test', enteredAt: firstTestingDate },
      { to: 'In Progress', enteredAt: new Date(firstDevDate.getTime() + (2 * 1000 * 60 * 60 * 24)) },
      { to: 'Done', enteredAt: doneDate }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0]?.enteredAt).toStrictEqual(createdDate);
    expect(result[1]?.enteredAt).toStrictEqual(firstDevDate);
    expect(result[2]?.enteredAt).toStrictEqual(firstTestingDate);
    expect(result[3]?.enteredAt).toStrictEqual(doneDate);
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
    expect(result[1]?.stage.stageType).toBe('ready');
  });

  it('should return stage changes in workflow order', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'backlog'));
    expect(result[1]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'ready'));
    expect(result[2]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[3]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'done'));
  });

  it('should find actual cycle start when issue visited cycle start stage', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true },
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(5);
    expect(result[2]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
    expect(result[2]?.isActualCycleStart).toBe(true);
  });

  it('should set actual cycle start to ready when issue skipped cycle start stage but has ready & in-progress stages', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true },
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[1]?.isActualCycleStart).toBe(true);
  });

  it('should set actual cycle start to new when issue skipped ready & cycle start stage, but has in-progress stage', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(3);
    expect(result[0]?.isActualCycleStart).toBe(true);
  });

  it('should not set actual cycle start if issue has not passed cycle start', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-14T09:43:00'), isAddedToSprint: true }
    ];
    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(2);
    expect(result[0]?.isActualCycleStart).toBe(undefined);
    expect(result[1]?.isActualCycleStart).toBe(undefined);
  });

  it('should not set actual cycle start if issue never went in progress but is closed', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-14T09:43:00'), isAddedToSprint: true },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(3);
    expect(result[0]?.isActualCycleStart).toBe(undefined);
    expect(result[1]?.isActualCycleStart).toBe(undefined);
    expect(result[2]?.isActualCycleStart).toBe(undefined);
  });

  it('should set actual cycle start to previous available in-progress state if issue skipped cycle start', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-14T09:43:00'), isAddedToSprint: true },
      { to: 'Analyze', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];
    const weirdWorkflow: WorkflowDefinition = {
      name: 'Weird Workflow',
      key: 'weird-workflow',
      stages: [
        { key: 'backlog', name: 'Backlog', stageType: 'new', jiraStatuses: ['New'] },
        { key: 'ready', name: 'Ready', stageType: 'ready', jiraStatuses: [], isAddedToSprint: true },
        { key: 'analyze', name: 'Analyze', stageType: 'in-progress', jiraStatuses: ['Analyze'] },
        { key: 'dev', name: 'Dev', stageType: 'in-progress', jiraStatuses: ['In Progress'], isCycleStart: true },
        { key: 'test', name: 'Test', stageType: 'in-progress', jiraStatuses: ['Test'] },
        { key: 'done', name: 'Done', stageType: 'done', jiraStatuses: ['Done'], isCycleEnd: true }
      ]
    }

    const result: SequentialStageEntry[] = buildSequentialFlow(weirdWorkflow, createdDate, statusChanges);

    expect(result.length).toBe(5);
    expect(result[2]?.isActualCycleStart).toBe(true);
  });

  it('should create history even if events are not defined in workflow', () => {
    const createdDate = new Date('2026-02-04');
    const statusChanges: StatusChange[] = [
      { to: 'Sprint 1', enteredAt: new Date('2026-02-10T08:36:37'), isAddedToSprint: true },
      { to: 'Analysis', enteredAt: new Date('2026-02-08T12:32:23') },
      { to: 'Done', enteredAt: new Date('2024-03-01T07:39:31') }
    ]
    const noSprintWorkflow: WorkflowDefinition = {
      name: 'Workflow with no added to sprint',
      key: 'nosprint-workflow',
      stages: [
        { key: 'backlog', name: 'Backlog', stageType: 'new', jiraStatuses: ['Backlog'] },
        { key: 'ready', name: 'Ready', stageType: 'ready', jiraStatuses: ['To Do'] },
        { key: 'dev', name: 'Dev', stageType: 'in-progress', jiraStatuses: ['Development'] },
        { key: 'done', name: 'Done', stageType: 'done', jiraStatuses: ['Done', 'Development Closed', 'Abandoned'], isCycleEnd: true }
      ]
    }

    const result: SequentialStageEntry[] = buildSequentialFlow(noSprintWorkflow, createdDate, statusChanges);

    expect(result.length).toBe(2);
    expect(result[0]?.stage.key).toBe('backlog')
    expect(result[1]?.stage.key).toBe('done')
  });

  it('should throw error if backlog missing', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const badWorkflow: WorkflowDefinition = {
      key: 'bad-workflow',
      name: 'Bad workflow',
      stages: []
    };

    expect(() => buildSequentialFlow(badWorkflow, createdDate, [])).toThrow('Workflow must have at least a backlog stage');
  });

});