import { describe, it, expect } from 'vitest';
import {
  SeveritySchema,
  IssueSchema,
  TechStackSchema,
  QualityThresholdsSchema,
  WeightsSchema,
  ReviewResultSchema,
  AggregatorInputSchema,
  AggregatorOutputSchema,
  RecommendationSchema,
  CodeWriterInputSchema,
  CodeWriterOutputSchema,
} from '../src/schemas/index.js';

describe('Schema Validation', () => {
  describe('SeveritySchema', () => {
    it('should accept valid severities', () => {
      expect(SeveritySchema.parse('Critical')).toBe('Critical');
      expect(SeveritySchema.parse('High')).toBe('High');
      expect(SeveritySchema.parse('Medium')).toBe('Medium');
      expect(SeveritySchema.parse('Low')).toBe('Low');
    });

    it('should reject invalid severities', () => {
      expect(() => SeveritySchema.parse('invalid')).toThrow();
      expect(() => SeveritySchema.parse('critical')).toThrow(); // Case sensitive
    });
  });

  describe('IssueSchema', () => {
    it('should accept valid issue', () => {
      const issue = {
        id: 'SEC-001',
        source: 'security-reviewer',
        severity: 'Critical',
        type: 'SQL_INJECTION',
        file: 'src/db.ts',
        line: 42,
        description: 'SQL injection risk',
        suggestion: 'Use parameterized queries',
      };
      expect(IssueSchema.parse(issue)).toMatchObject(issue);
    });

    it('should accept issue without optional fields', () => {
      const issue = {
        id: 'SEC-001',
        source: 'security-reviewer',
        severity: 'High',
        type: 'XSS',
        file: 'src/app.ts',
        description: 'XSS risk',
        suggestion: 'Escape output',
      };
      expect(IssueSchema.parse(issue)).toMatchObject(issue);
    });

    it('should reject invalid source', () => {
      const issue = {
        id: 'SEC-001',
        source: 'invalid-reviewer',
        severity: 'Critical',
        type: 'SQL_INJECTION',
        file: 'src/db.ts',
        description: 'SQL injection risk',
        suggestion: 'Use parameterized queries',
      };
      expect(() => IssueSchema.parse(issue)).toThrow();
    });
  });

  describe('QualityThresholdsSchema', () => {
    it('should apply defaults', () => {
      const result = QualityThresholdsSchema.parse({});
      expect(result.security_min).toBe(85);
      expect(result.quality_min).toBe(80);
      expect(result.performance_min).toBe(80);
      expect(result.overall_min).toBe(80);
      expect(result.max_critical_issues).toBe(0);
      expect(result.max_high_issues).toBe(2);
      expect(result.max_iterations).toBe(5);
    });

    it('should allow overriding defaults', () => {
      const result = QualityThresholdsSchema.parse({
        security_min: 90,
        max_high_issues: 5,
      });
      expect(result.security_min).toBe(90);
      expect(result.max_high_issues).toBe(5);
      expect(result.quality_min).toBe(80); // Still default
    });

    it('should reject out of range values', () => {
      expect(() =>
        QualityThresholdsSchema.parse({ security_min: 150 })
      ).toThrow();
      expect(() =>
        QualityThresholdsSchema.parse({ quality_min: -10 })
      ).toThrow();
    });
  });

  describe('WeightsSchema', () => {
    it('should apply defaults', () => {
      const result = WeightsSchema.parse({});
      expect(result.security).toBe(0.4);
      expect(result.quality).toBe(0.35);
      expect(result.performance).toBe(0.25);
    });

    it('should reject weights not summing to 1.0', () => {
      expect(() =>
        WeightsSchema.parse({
          security: 0.5,
          quality: 0.5,
          performance: 0.5,
        })
      ).toThrow('Weights must sum to 1.0');
    });

    it('should accept weights summing to 1.0', () => {
      const result = WeightsSchema.parse({
        security: 0.5,
        quality: 0.3,
        performance: 0.2,
      });
      expect(result.security).toBe(0.5);
    });
  });

  describe('TechStackSchema', () => {
    it('should accept minimal tech stack', () => {
      const result = TechStackSchema.parse({ language: 'TypeScript' });
      expect(result.language).toBe('TypeScript');
    });

    it('should accept full tech stack', () => {
      const techStack = {
        language: 'Python',
        language_version: '3.11',
        framework: 'FastAPI',
        framework_version: '0.100.0',
        build_tool: 'pip',
        test_framework: 'pytest',
        code_style: 'Black + isort',
        constraints: ['async/await', 'Pydantic v2'],
        project_type: 'single',
      };
      expect(TechStackSchema.parse(techStack)).toMatchObject(techStack);
    });

    it('should accept tech stack with quality thresholds', () => {
      const techStack = {
        language: 'TypeScript',
        quality_thresholds: {
          security_min: 90,
        },
      };
      const result = TechStackSchema.parse(techStack);
      expect(result.quality_thresholds?.security_min).toBe(90);
    });
  });

  describe('ReviewResultSchema', () => {
    it('should accept valid review result', () => {
      const result = {
        passed: true,
        score: 92,
        issues: [],
        summary: 'All checks passed',
      };
      expect(ReviewResultSchema.parse(result)).toMatchObject(result);
    });

    it('should reject score out of range', () => {
      expect(() =>
        ReviewResultSchema.parse({
          passed: true,
          score: 150,
          issues: [],
        })
      ).toThrow();
    });
  });

  describe('RecommendationSchema', () => {
    it('should accept valid recommendations', () => {
      expect(RecommendationSchema.parse('PASS')).toBe('PASS');
      expect(RecommendationSchema.parse('ITERATE')).toBe('ITERATE');
      expect(RecommendationSchema.parse('FAIL_MAX_ITERATIONS')).toBe(
        'FAIL_MAX_ITERATIONS'
      );
      expect(RecommendationSchema.parse('STALLED')).toBe('STALLED');
    });
  });

  describe('AggregatorInputSchema', () => {
    it('should accept valid aggregator input', () => {
      const input = {
        iteration: 1,
        tech_stack: { language: 'TypeScript' },
        security_result: { passed: true, score: 90, issues: [] },
        quality_result: { passed: true, score: 85, issues: [] },
        performance_result: { passed: true, score: 88, issues: [] },
      };
      expect(AggregatorInputSchema.parse(input)).toMatchObject(input);
    });

    it('should accept input with previous scores', () => {
      const input = {
        iteration: 3,
        tech_stack: { language: 'Python' },
        security_result: { passed: true, score: 90, issues: [] },
        quality_result: { passed: true, score: 85, issues: [] },
        performance_result: { passed: true, score: 88, issues: [] },
        previous_scores: [65, 78],
      };
      expect(AggregatorInputSchema.parse(input)).toMatchObject(input);
    });
  });

  describe('CodeWriterInputSchema', () => {
    it('should accept initial code writer input', () => {
      const input = {
        requirement: 'Implement user authentication',
        tech_stack: {
          language: 'TypeScript',
          framework: 'Express',
        },
      };
      expect(CodeWriterInputSchema.parse(input)).toMatchObject(input);
    });

    it('should accept iteration input with feedback', () => {
      const input = {
        requirement: 'Implement user authentication',
        tech_stack: { language: 'TypeScript' },
        previous_code: 'const login = () => {}',
        feedback: 'Add input validation',
        issues: [
          {
            id: 'SEC-001',
            source: 'security-reviewer',
            severity: 'High',
            type: 'INPUT_VALIDATION',
            file: 'src/auth.ts',
            description: 'Missing input validation',
            suggestion: 'Add Zod validation',
          },
        ],
      };
      expect(CodeWriterInputSchema.parse(input)).toMatchObject(input);
    });
  });

  describe('CodeWriterOutputSchema', () => {
    it('should accept valid code writer output', () => {
      const output = {
        code: 'export function login() { return true; }',
        files_modified: ['src/auth.ts'],
        changes_made: ['Implemented login function'],
        confidence: 0.9,
      };
      expect(CodeWriterOutputSchema.parse(output)).toMatchObject(output);
    });

    it('should reject confidence out of range', () => {
      expect(() =>
        CodeWriterOutputSchema.parse({
          code: 'test',
          files_modified: [],
          changes_made: [],
          confidence: 1.5,
        })
      ).toThrow();
    });
  });
});
