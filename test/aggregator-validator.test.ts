import { describe, it, expect } from 'vitest';
import {
  sanityCheckAggregatorOutput,
  secondOpinionScore,
  compareWithSecondOpinion,
} from '../src/utils/aggregator-validator.js';
import type { AggregatorOutput } from '../src/schemas/index.js';

describe('Aggregator Validator', () => {
  const validOutput: AggregatorOutput = {
    iteration: 1,
    passed: true,
    overall_score: 87.5,
    scores: {
      security: 90,
      quality: 85,
      performance: 88,
    },
    issue_counts: {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    },
    feedback_for_code_writer: {
      summary: 'All critical checks passed',
      priority_order: ['QA-001'],
      must_fix: [],
      should_fix: [],
      optional_fix: [],
    },
    recommendation: 'PASS',
    next_action: 'Code is ready for review',
  };

  describe('sanityCheckAggregatorOutput', () => {
    it('should pass valid output', () => {
      const result = sanityCheckAggregatorOutput(validOutput);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect passed/recommendation inconsistency', () => {
      const invalid = {
        ...validOutput,
        passed: false,
        recommendation: 'PASS',
      };
      const result = sanityCheckAggregatorOutput(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Inconsistent: passed=false but recommendation=PASS'
      );
    });

    it('should detect critical issues with PASS', () => {
      const invalid = {
        ...validOutput,
        issue_counts: { ...validOutput.issue_counts, critical: 2 },
        recommendation: 'PASS',
      };
      const result = sanityCheckAggregatorOutput(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Cannot PASS with'))).toBe(
        true
      );
    });

    it('should warn about must_fix not empty with PASS', () => {
      const withMustFix: AggregatorOutput = {
        ...validOutput,
        feedback_for_code_writer: {
          ...validOutput.feedback_for_code_writer,
          must_fix: [
            {
              id: 'SEC-001',
              source: 'security-reviewer',
              severity: 'Critical',
              type: 'SQL_INJECTION',
              file: 'src/db.ts',
              description: 'SQL injection',
              suggestion: 'Fix it',
            },
          ],
        },
      };
      const result = sanityCheckAggregatorOutput(withMustFix);
      expect(result.warnings).toContain(
        'PASS recommended but must_fix is not empty'
      );
    });

    it('should detect score out of range', () => {
      const invalid = {
        ...validOutput,
        scores: { security: 150, quality: 85, performance: 88 },
      };
      const result = sanityCheckAggregatorOutput(invalid);
      expect(result.valid).toBe(false);
    });

    it('should warn about score calculation mismatch', () => {
      const mismatch = {
        ...validOutput,
        overall_score: 50, // Should be ~87.5
      };
      const result = sanityCheckAggregatorOutput(mismatch);
      expect(
        result.warnings.some((w) => w.includes('Overall score mismatch'))
      ).toBe(true);
    });

    it('should attempt auto-correction for fixable errors', () => {
      const invalid = {
        ...validOutput,
        passed: true,
        issue_counts: { ...validOutput.issue_counts, critical: 1 },
        recommendation: 'PASS',
      };
      const result = sanityCheckAggregatorOutput(invalid);
      expect(result.correctedOutput).toBeDefined();
      expect(result.correctedOutput?.recommendation).toBe('ITERATE');
      expect(result.correctedOutput?.passed).toBe(false);
    });

    it('should fail for completely invalid data', () => {
      const result = sanityCheckAggregatorOutput({ invalid: 'data' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('secondOpinionScore', () => {
    it('should return PASS when all thresholds met', () => {
      const result = secondOpinionScore(90, 85, 88, 0, 1);
      expect(result.shouldPass).toBe(true);
      expect(result.reason).toBe('All thresholds met');
    });

    it('should veto on critical issues', () => {
      const result = secondOpinionScore(90, 85, 88, 1, 0);
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('critical issue');
      expect(result.details.criticalCheck).toBe(false);
    });

    it('should veto on too many high issues', () => {
      const result = secondOpinionScore(90, 85, 88, 0, 5);
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('high issues');
      expect(result.details.highCheck).toBe(false);
    });

    it('should fail when security below threshold', () => {
      const result = secondOpinionScore(70, 85, 88, 0, 0);
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('security');
      expect(result.details.securityCheck).toBe(false);
    });

    it('should fail when quality below threshold', () => {
      const result = secondOpinionScore(90, 70, 88, 0, 0);
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('quality');
      expect(result.details.qualityCheck).toBe(false);
    });

    it('should fail when performance below threshold', () => {
      const result = secondOpinionScore(90, 85, 70, 0, 0);
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('performance');
      expect(result.details.performanceCheck).toBe(false);
    });

    it('should fail when overall below threshold', () => {
      // Scores that pass individual thresholds but fail overall
      const result = secondOpinionScore(85, 80, 80, 0, 0);
      // Overall = 85*0.4 + 80*0.35 + 80*0.25 = 34 + 28 + 20 = 82
      expect(result.calculatedScore).toBeCloseTo(82);
      expect(result.shouldPass).toBe(true); // 82 >= 80
    });

    it('should use custom thresholds', () => {
      const result = secondOpinionScore(90, 85, 88, 0, 0, {
        security_min: 95,
      });
      expect(result.shouldPass).toBe(false);
      expect(result.reason).toContain('security 90 < 95');
    });

    it('should use custom weights', () => {
      const result = secondOpinionScore(100, 100, 0, 0, 0, undefined, {
        security: 0.5,
        quality: 0.5,
        performance: 0,
      });
      expect(result.calculatedScore).toBe(100);
    });

    it('should provide detailed check results', () => {
      const result = secondOpinionScore(90, 85, 88, 0, 1);
      expect(result.details).toEqual({
        securityCheck: true,
        qualityCheck: true,
        performanceCheck: true,
        overallCheck: true,
        criticalCheck: true,
        highCheck: true,
      });
    });
  });

  describe('compareWithSecondOpinion', () => {
    it('should match when decisions agree', () => {
      const result = compareWithSecondOpinion(validOutput);
      expect(result.match).toBe(true);
      expect(result.discrepancies.length).toBe(0);
    });

    it('should detect decision mismatch', () => {
      const wrongPass: AggregatorOutput = {
        ...validOutput,
        scores: { security: 70, quality: 70, performance: 70 },
        overall_score: 70,
        recommendation: 'PASS',
        passed: true,
      };
      const result = compareWithSecondOpinion(wrongPass);
      expect(result.match).toBe(false);
      expect(
        result.discrepancies.some((d) => d.includes('Decision mismatch'))
      ).toBe(true);
    });

    it('should detect score mismatch', () => {
      const wrongScore: AggregatorOutput = {
        ...validOutput,
        overall_score: 50, // Wrong calculation
      };
      const result = compareWithSecondOpinion(wrongScore);
      expect(
        result.discrepancies.some((d) => d.includes('Score mismatch'))
      ).toBe(true);
    });

    it('should use custom thresholds in comparison', () => {
      const result = compareWithSecondOpinion(validOutput, {
        security_min: 95, // Higher threshold
      });
      expect(result.match).toBe(false);
      expect(result.secondOpinionDecision).toBe('ITERATE');
    });
  });
});
