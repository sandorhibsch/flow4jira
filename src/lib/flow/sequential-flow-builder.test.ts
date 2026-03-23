
import type { SequentialStageEntry } from "./sequential-flow-builder";
import { buildSequentialFlow } from "./sequential-flow-builder";
import type { StatusChange } from "./history-builder";
import { TEST_WORKFLOW } from "../testutils/create-mocks";

describe('Sequential flow test', () => {
  it('should return new stage for issue without changes', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const emptyChanges: StatusChange[] = [];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, emptyChanges);

    expect(result.length).toBe(1);
    expect(result[0]?.enteredAt).toBe(createdDate);
    expect(result[0]?.stage).toBe(TEST_WORKFLOW.stages[0]);
  });

  it('should return all stage changes including added to sprint', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'To Do', enteredAt: new Date('2025-01-10T10:00:00'), isAddedToSprint: true },
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') }
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(4);
    expect(result[0]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'backlog'));
    expect(result[1]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'ready'));
    expect(result[2]?.stage).toBe(TEST_WORKFLOW.stages.find(s => s.key === 'dev'));
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
      { to: 'In Progress', enteredAt: new Date('2025-01-12T09:43:00') },
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

  it('should find actual cycle start when default', () => {
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

  it('should find actual cycle start when went from to do to testing', () => {
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

  it('should find actual cycle start when went from new to testing', () => {
    const createdDate = new Date('2025-01-01T00:00:00');
    const statusChanges: StatusChange[] = [
      { to: 'Test', enteredAt: new Date('2025-01-14T09:43:00') },
      { to: 'Done', enteredAt: new Date('2025-01-18T11:12:00') },
    ];

    const result: SequentialStageEntry[] = buildSequentialFlow(TEST_WORKFLOW, createdDate, statusChanges);

    expect(result.length).toBe(3);
    expect(result[0]?.isActualCycleStart).toBe(true);
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
    expect(result[1]?.isActualCycleStart).toBe(true);
    expect(result[0]?.isActualCycleStart).toBe(undefined);
  });

});