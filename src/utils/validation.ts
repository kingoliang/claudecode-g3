/**
 * Validation utilities for safe schema validation
 */
import { ZodSchema, ZodError } from 'zod';

export interface ValidationError {
  path: string;
  message: string;
  received: unknown;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

/**
 * Safe validation that returns a structured result instead of throwing
 */
export function safeValidate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          received: data,
        })),
      };
    }
    throw error;
  }
}

/**
 * Validate and apply default values from schema
 */
export function validateWithDefaults<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Parse JSON string and validate against schema
 */
export function parseAndValidate<T>(
  schema: ZodSchema<T>,
  jsonString: string
): ValidationResult<T> {
  try {
    const parsed = JSON.parse(jsonString);
    return safeValidate(schema, parsed);
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          path: '',
          message: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
          received: jsonString,
        },
      ],
    };
  }
}

/**
 * Type guard for checking if validation succeeded
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationResult<T> & { success: true; data: T } {
  return result.success && result.data !== undefined;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((e) => (e.path ? `${e.path}: ${e.message}` : e.message))
    .join('\n');
}
