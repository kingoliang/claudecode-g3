/**
 * Constants Synchronization Tests
 *
 * These tests ensure that default values are consistent across:
 * - src/constants.ts (single source of truth)
 * - src/schemas/index.ts (Zod schema defaults)
 * - templates/agents/result-aggregator.md (agent instructions)
 *
 * If any of these tests fail, it means the values have drifted out of sync.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import {
  DEFAULT_QUALITY_THRESHOLDS,
  DEFAULT_WEIGHTS,
  CONSTANTS_VERSION,
  STALL_DETECTION,
  generatePythonStyleDefaults,
} from '../src/constants.js';
import {
  QualityThresholdsSchema,
  WeightsSchema,
} from '../src/schemas/index.js';
import { extractFrontmatter, parseSimpleYaml } from '../src/utils/yaml-parser.js';

describe('Constants Synchronization', () => {
  describe('constants.ts is the source of truth', () => {
    it('should have valid default quality thresholds', () => {
      expect(DEFAULT_QUALITY_THRESHOLDS.security_min).toBe(85);
      expect(DEFAULT_QUALITY_THRESHOLDS.quality_min).toBe(80);
      expect(DEFAULT_QUALITY_THRESHOLDS.performance_min).toBe(80);
      expect(DEFAULT_QUALITY_THRESHOLDS.overall_min).toBe(80);
      expect(DEFAULT_QUALITY_THRESHOLDS.max_critical_issues).toBe(0);
      expect(DEFAULT_QUALITY_THRESHOLDS.max_high_issues).toBe(2);
      expect(DEFAULT_QUALITY_THRESHOLDS.max_iterations).toBe(5);
      expect(DEFAULT_QUALITY_THRESHOLDS.stall_threshold).toBe(5);
      expect(DEFAULT_QUALITY_THRESHOLDS.stall_rounds).toBe(2);
    });

    it('should have valid default weights that sum to 1.0', () => {
      expect(DEFAULT_WEIGHTS.security).toBe(0.4);
      expect(DEFAULT_WEIGHTS.quality).toBe(0.35);
      expect(DEFAULT_WEIGHTS.performance).toBe(0.25);

      const sum =
        DEFAULT_WEIGHTS.security +
        DEFAULT_WEIGHTS.quality +
        DEFAULT_WEIGHTS.performance;
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    });

    it('should have valid stall detection thresholds', () => {
      expect(STALL_DETECTION.oscillation_range).toBe(6);
      expect(STALL_DETECTION.oscillation_rounds).toBe(3);
      expect(STALL_DETECTION.regression_threshold).toBe(10);
      expect(STALL_DETECTION.critical_persist_rounds).toBe(3);
    });
  });

  describe('schemas/index.ts uses constants.ts values', () => {
    it('should use same defaults for QualityThresholdsSchema', () => {
      const parsed = QualityThresholdsSchema.parse({});

      expect(parsed.security_min).toBe(DEFAULT_QUALITY_THRESHOLDS.security_min);
      expect(parsed.quality_min).toBe(DEFAULT_QUALITY_THRESHOLDS.quality_min);
      expect(parsed.performance_min).toBe(DEFAULT_QUALITY_THRESHOLDS.performance_min);
      expect(parsed.overall_min).toBe(DEFAULT_QUALITY_THRESHOLDS.overall_min);
      expect(parsed.max_critical_issues).toBe(DEFAULT_QUALITY_THRESHOLDS.max_critical_issues);
      expect(parsed.max_high_issues).toBe(DEFAULT_QUALITY_THRESHOLDS.max_high_issues);
      expect(parsed.max_iterations).toBe(DEFAULT_QUALITY_THRESHOLDS.max_iterations);
      expect(parsed.stall_threshold).toBe(DEFAULT_QUALITY_THRESHOLDS.stall_threshold);
      expect(parsed.stall_rounds).toBe(DEFAULT_QUALITY_THRESHOLDS.stall_rounds);
    });

    it('should use same defaults for WeightsSchema', () => {
      const parsed = WeightsSchema.parse({});

      expect(parsed.security).toBe(DEFAULT_WEIGHTS.security);
      expect(parsed.quality).toBe(DEFAULT_WEIGHTS.quality);
      expect(parsed.performance).toBe(DEFAULT_WEIGHTS.performance);
    });
  });

  describe('result-aggregator.md template consistency', () => {
    let templateContent: string;
    let frontmatter: Record<string, string>;

    beforeAll(async () => {
      const templatePath = path.join(
        __dirname,
        '../templates/agents/result-aggregator.md'
      );
      templateContent = await fs.readFile(templatePath, 'utf-8');
      const extracted = extractFrontmatter(templateContent);
      frontmatter = extracted ? parseSimpleYaml(extracted) : {};
    });

    it('should have constants_version in frontmatter', () => {
      expect(frontmatter.constants_version).toBeDefined();
      expect(frontmatter.constants_version).toBe(CONSTANTS_VERSION);
    });

    it('should contain correct DEFAULT_THRESHOLDS values', () => {
      // Extract the Python-style DEFAULT_THRESHOLDS from template
      const thresholdsMatch = templateContent.match(
        /DEFAULT_THRESHOLDS\s*=\s*\{([^}]+)\}/
      );
      expect(thresholdsMatch).not.toBeNull();

      const thresholdsBlock = thresholdsMatch![1];

      // Check each value
      expect(thresholdsBlock).toContain(
        `"security_min": ${DEFAULT_QUALITY_THRESHOLDS.security_min}`
      );
      expect(thresholdsBlock).toContain(
        `"quality_min": ${DEFAULT_QUALITY_THRESHOLDS.quality_min}`
      );
      expect(thresholdsBlock).toContain(
        `"performance_min": ${DEFAULT_QUALITY_THRESHOLDS.performance_min}`
      );
      expect(thresholdsBlock).toContain(
        `"overall_min": ${DEFAULT_QUALITY_THRESHOLDS.overall_min}`
      );
      expect(thresholdsBlock).toContain(
        `"max_critical_issues": ${DEFAULT_QUALITY_THRESHOLDS.max_critical_issues}`
      );
      expect(thresholdsBlock).toContain(
        `"max_high_issues": ${DEFAULT_QUALITY_THRESHOLDS.max_high_issues}`
      );
      expect(thresholdsBlock).toContain(
        `"max_iterations": ${DEFAULT_QUALITY_THRESHOLDS.max_iterations}`
      );
      expect(thresholdsBlock).toContain(
        `"stall_threshold": ${DEFAULT_QUALITY_THRESHOLDS.stall_threshold}`
      );
      expect(thresholdsBlock).toContain(
        `"stall_rounds": ${DEFAULT_QUALITY_THRESHOLDS.stall_rounds}`
      );
    });

    it('should contain correct DEFAULT_WEIGHTS values', () => {
      // Extract the Python-style DEFAULT_WEIGHTS from template
      const weightsMatch = templateContent.match(
        /DEFAULT_WEIGHTS\s*=\s*\{([^}]+)\}/
      );
      expect(weightsMatch).not.toBeNull();

      const weightsBlock = weightsMatch![1];

      expect(weightsBlock).toContain(`"security": ${DEFAULT_WEIGHTS.security}`);
      expect(weightsBlock).toContain(`"quality": ${DEFAULT_WEIGHTS.quality}`);
      expect(weightsBlock).toContain(
        `"performance": ${DEFAULT_WEIGHTS.performance}`
      );
    });

    it('should contain correct threshold table values', () => {
      // Check the markdown table has correct values
      expect(templateContent).toContain(
        `| Critical 问题上限 | \`max_critical_issues\` | ${DEFAULT_QUALITY_THRESHOLDS.max_critical_issues} |`
      );
      expect(templateContent).toContain(
        `| High 问题上限 | \`max_high_issues\` | ${DEFAULT_QUALITY_THRESHOLDS.max_high_issues} |`
      );
      expect(templateContent).toContain(
        `| 安全评分最低 | \`security_min\` | ${DEFAULT_QUALITY_THRESHOLDS.security_min} |`
      );
      expect(templateContent).toContain(
        `| 质量评分最低 | \`quality_min\` | ${DEFAULT_QUALITY_THRESHOLDS.quality_min} |`
      );
      expect(templateContent).toContain(
        `| 性能评分最低 | \`performance_min\` | ${DEFAULT_QUALITY_THRESHOLDS.performance_min} |`
      );
      expect(templateContent).toContain(
        `| 综合评分最低 | \`overall_min\` | ${DEFAULT_QUALITY_THRESHOLDS.overall_min} |`
      );
      expect(templateContent).toContain(
        `| 安全权重 | \`weights.security\` | ${DEFAULT_WEIGHTS.security} |`
      );
      expect(templateContent).toContain(
        `| 质量权重 | \`weights.quality\` | ${DEFAULT_WEIGHTS.quality} |`
      );
      expect(templateContent).toContain(
        `| 性能权重 | \`weights.performance\` | ${DEFAULT_WEIGHTS.performance} |`
      );
    });

    it('should contain correct stall detection values', () => {
      // Check stall detection thresholds in template
      // The template mentions "分数在±3分内波动" which is oscillation_range/2
      expect(templateContent).toContain('±3分');
      expect(templateContent).toContain('下降>10分'); // regression_threshold
      expect(templateContent).toContain('持续3轮'); // critical_persist_rounds
    });
  });

  describe('generatePythonStyleDefaults helper', () => {
    it('should generate correct Python-style code', () => {
      const generated = generatePythonStyleDefaults();

      expect(generated).toContain('DEFAULT_THRESHOLDS = {');
      expect(generated).toContain('DEFAULT_WEIGHTS = {');
      expect(generated).toContain(
        `"security_min": ${DEFAULT_QUALITY_THRESHOLDS.security_min}`
      );
      expect(generated).toContain(`"security": ${DEFAULT_WEIGHTS.security}`);
    });
  });
});

describe('Cross-component consistency', () => {
  it('should have CONSTANTS_VERSION defined and valid', () => {
    expect(CONSTANTS_VERSION).toBeDefined();
    expect(typeof CONSTANTS_VERSION).toBe('string');
    // Semantic version format: X.Y.Z
    expect(CONSTANTS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('critical issues should always be zero tolerance by default', () => {
    // This is a business rule: critical issues = hard veto
    expect(DEFAULT_QUALITY_THRESHOLDS.max_critical_issues).toBe(0);
  });

  it('security should have highest weight by default', () => {
    // This is a business rule: security > quality > performance
    expect(DEFAULT_WEIGHTS.security).toBeGreaterThan(DEFAULT_WEIGHTS.quality);
    expect(DEFAULT_WEIGHTS.quality).toBeGreaterThan(DEFAULT_WEIGHTS.performance);
  });
});
