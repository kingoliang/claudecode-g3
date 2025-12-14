import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { copyTemplates, getTemplatesDir } from '../src/utils/templates.js';

describe('getTemplatesDir', () => {
  it('should return a valid path', () => {
    const templatesDir = getTemplatesDir();
    expect(templatesDir).toBeDefined();
    expect(typeof templatesDir).toBe('string');
  });
});

describe('copyTemplates', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should copy basic templates', async () => {
    await copyTemplates(tempDir);

    // Check agents
    expect(await fs.pathExists(path.join(tempDir, '.claude/agents/code-writer.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, '.claude/agents/security-reviewer.md'))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, '.claude/agents/quality-checker.md'))).toBe(true);

    // Check commands
    expect(await fs.pathExists(path.join(tempDir, '.claude/commands/iterative-code.md'))).toBe(true);

    // os-apply-iterative should NOT be copied without --with-openspec
    expect(await fs.pathExists(path.join(tempDir, '.claude/commands/os-apply-iterative.md'))).toBe(false);

    // Check skills
    expect(await fs.pathExists(path.join(tempDir, '.claude/skills/iterative-workflow/SKILL.md'))).toBe(true);
  });

  it('should copy OpenSpec templates when option is set', async () => {
    await copyTemplates(tempDir, { withOpenspec: true });

    // os-apply-iterative should be copied
    expect(await fs.pathExists(path.join(tempDir, '.claude/commands/os-apply-iterative.md'))).toBe(true);
  });
});
