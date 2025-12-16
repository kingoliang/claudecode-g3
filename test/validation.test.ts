import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  safeValidate,
  parseAndValidate,
  validateWithDefaults,
  isValidationSuccess,
  formatValidationErrors,
} from '../src/utils/validation.js';

describe('Validation Utilities', () => {
  const TestSchema = z.object({
    name: z.string(),
    age: z.number().min(0).max(150),
    email: z.string().email().optional(),
  });

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const result = safeValidate(TestSchema, { name: 'John', age: 30 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data', () => {
      const result = safeValidate(TestSchema, { name: 123, age: 'thirty' });
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return error for out of range value', () => {
      const result = safeValidate(TestSchema, { name: 'John', age: 200 });
      expect(result.success).toBe(false);
      expect(result.errors![0].path).toBe('age');
    });

    it('should validate optional fields when provided', () => {
      const result = safeValidate(TestSchema, {
        name: 'John',
        age: 30,
        email: 'invalid-email',
      });
      expect(result.success).toBe(false);
      expect(result.errors![0].path).toBe('email');
    });
  });

  describe('parseAndValidate', () => {
    it('should parse and validate valid JSON', () => {
      const jsonString = '{"name": "John", "age": 30}';
      const result = parseAndValidate(TestSchema, jsonString);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should return error for invalid JSON', () => {
      const jsonString = '{ invalid json }';
      const result = parseAndValidate(TestSchema, jsonString);
      expect(result.success).toBe(false);
      expect(result.errors![0].message).toContain('Invalid JSON');
    });

    it('should return error for valid JSON but invalid schema', () => {
      const jsonString = '{"name": 123, "age": "thirty"}';
      const result = parseAndValidate(TestSchema, jsonString);
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validateWithDefaults', () => {
    const SchemaWithDefaults = z.object({
      name: z.string(),
      role: z.string().default('user'),
      active: z.boolean().default(true),
    });

    it('should apply defaults for missing fields', () => {
      const result = validateWithDefaults(SchemaWithDefaults, { name: 'John' });
      expect(result).toEqual({
        name: 'John',
        role: 'user',
        active: true,
      });
    });

    it('should not override provided values', () => {
      const result = validateWithDefaults(SchemaWithDefaults, {
        name: 'John',
        role: 'admin',
        active: false,
      });
      expect(result).toEqual({
        name: 'John',
        role: 'admin',
        active: false,
      });
    });

    it('should throw for invalid data', () => {
      expect(() =>
        validateWithDefaults(SchemaWithDefaults, { role: 'admin' })
      ).toThrow();
    });
  });

  describe('isValidationSuccess', () => {
    it('should return true for successful validation', () => {
      const result = safeValidate(TestSchema, { name: 'John', age: 30 });
      expect(isValidationSuccess(result)).toBe(true);
    });

    it('should return false for failed validation', () => {
      const result = safeValidate(TestSchema, { name: 123 });
      expect(isValidationSuccess(result)).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors with paths', () => {
      const errors = [
        { path: 'name', message: 'Expected string', received: 123 },
        { path: 'age', message: 'Expected number', received: 'thirty' },
      ];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('name: Expected string');
      expect(formatted).toContain('age: Expected number');
    });

    it('should handle empty path', () => {
      const errors = [{ path: '', message: 'Invalid input', received: null }];
      const formatted = formatValidationErrors(errors);
      expect(formatted).toBe('Invalid input');
    });
  });
});
