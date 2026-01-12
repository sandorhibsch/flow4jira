// src/lib/validations/workflow.schema.ts

import { z } from 'zod';

/**
 * Schema for workflow stage types
 */
export const StageTypeSchema = z.enum(['new', 'ready', 'in-progress', 'done']);

/**
 * Schema for a single workflow stage
 * Note: jiraStatuses can be empty for Scrum boards where stages are derived from sprint membership
 */
export const WorkflowStageSchema = z.object({
  key: z.string().min(1, 'Stage key is required'),
  name: z.string().min(1, 'Stage name is required'),
  jiraStatuses: z.array(z.string()), // Can be empty for Scrum boards
  isAddedToSprint: z.boolean().optional(),
  isCycleStart: z.boolean().optional(),
  isCycleEnd: z.boolean().optional(),
  stageType: StageTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

/**
 * Schema for complete workflow definition
 */
export const WorkflowDefinitionSchema = z
  .object({
    key: z.string().min(1, 'Workflow key is required'),
    name: z.string().min(1, 'Workflow name is required'),
    stages: z.array(WorkflowStageSchema).min(1, 'At least one stage is required'),
  })
  .refine(
    (workflow) => {
      const hasDoneStage = workflow.stages.some((s) => s.stageType === 'done');
      return hasDoneStage;
    },
    { message: 'Workflow must have at least one "done" stage' }
  )
  .refine(
    (workflow) => {
      const hasCycleStart = workflow.stages.some((s) => s.isCycleStart);
      return hasCycleStart;
    },
    { message: 'Workflow must have at least one cycle start stage' }
  )
  .refine(
    (workflow) => {
      const hasCycleEnd = workflow.stages.some((s) => s.isCycleEnd);
      return hasCycleEnd;
    },
    { message: 'Workflow must have at least one cycle end stage' }
  )
  .refine(
    (workflow) => {
      const cycleEndCount = workflow.stages.filter((s) => s.isCycleEnd).length;
      return cycleEndCount <= 1;
    },
    { message: 'Workflow can have at most one cycle end stage' }
  );

/**
 * Type inference from schemas
 */
export type WorkflowStageInput = z.infer<typeof WorkflowStageSchema>;
export type WorkflowDefinitionInput = z.infer<typeof WorkflowDefinitionSchema>;
