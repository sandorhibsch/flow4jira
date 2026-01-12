// src/lib/validations/board-config.schema.ts

import { z } from 'zod';
import { WorkflowDefinitionSchema } from './workflow.schema';

/**
 * Schema for processed flow issue (simplified for validation)
 */
export const ProcessedFlowIssueSchema = z.object({
  key: z.string().min(1),
  summary: z.string(),
  issueType: z.string(),
  created: z.coerce.date(),
  flowHistory: z.array(z.unknown()), // Complex nested type, validated at runtime
  currentStage: z.object({
    key: z.string(),
    name: z.string(),
    stageType: z.enum(['new', 'ready', 'in-progress', 'done']),
  }),
  currentStatus: z.string(),
  done: z.coerce.date().optional().nullable(),
  url: z.string().url().optional().or(z.literal('')), // Can be empty string or missing
  leadTimeDays: z.number().min(0),
  cycleTimeDays: z.number().min(0),
  ageDays: z.number().min(0),
});

/**
 * Schema for saving board configuration
 */
export const SaveBoardConfigSchema = z.object({
  periodDays: z.coerce.number().int().min(1).max(365),
  workflow: WorkflowDefinitionSchema,
  boardName: z.string().optional(),
  boardType: z.string().optional(),
  processedIssues: z.array(ProcessedFlowIssueSchema).optional(),
});

/**
 * Schema for board ID parameter
 */
export const BoardIdSchema = z.string().min(1, 'Board ID is required');

/**
 * Type inference
 */
export type SaveBoardConfigInput = z.infer<typeof SaveBoardConfigSchema>;
export type ProcessedFlowIssueInput = z.infer<typeof ProcessedFlowIssueSchema>;
