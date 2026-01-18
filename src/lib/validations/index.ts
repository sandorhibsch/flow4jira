// src/lib/validations/index.ts

export * from './workflow.schema';
export * from './board-config.schema';

/**
 * Common validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod errors into a readable format
 */
import type { ZodError } from 'zod';

export function formatZodErrors(error: ZodError): ValidationError[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
