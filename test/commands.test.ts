import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('CLI Commands', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helix-test-'));
  });

  afterEach(async () => {
    // Clean up
    await fs.remove(tempDir);
    vi.clearAllMocks();
  });

  describe('init command', () => {
    it('should create .claude directory structure', async () => {
      const { init } = await import('../src/commands/init.js');

      // Suppress console output during test
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await init({ targetDir: tempDir });

      consoleSpy.mockRestore();

      // Check directory structure
      expect(await fs.pathExists(path.join(tempDir, '.claude'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.claude/agents'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.claude/commands'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.claude/skills'))).toBe(true);
    });

    it('should create version info file', async () => {
      const { init } = await import('../src/commands/init.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await init({ targetDir: tempDir });

      consoleSpy.mockRestore();

      const versionFile = path.join(tempDir, '.claude/iterative-workflow.json');
      expect(await fs.pathExists(versionFile)).toBe(true);

      const versionInfo = await fs.readJson(versionFile);
      expect(versionInfo).toHaveProperty('version');
      expect(versionInfo).toHaveProperty('installedAt');
      expect(versionInfo).toHaveProperty('components');
    });

    it('should copy agent files', async () => {
      const { init } = await import('../src/commands/init.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await init({ targetDir: tempDir });

      consoleSpy.mockRestore();

      const agentsDir = path.join(tempDir, '.claude/agents');
      const files = await fs.readdir(agentsDir);

      // Should have at least the core agents
      expect(files.length).toBeGreaterThan(0);
      expect(files).toContain('code-writer.md');
      expect(files).toContain('result-aggregator.md');
    });

    it('should exclude OpenSpec commands when withOpenspec is false', async () => {
      const { init } = await import('../src/commands/init.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await init({ targetDir: tempDir, withOpenspec: false });

      consoleSpy.mockRestore();

      const commandsDir = path.join(tempDir, '.claude/commands');
      const files = await fs.readdir(commandsDir);

      // Should not include OpenSpec-specific commands
      expect(files).not.toContain('os-apply-iterative.md');
    });

    it('should include OpenSpec commands when withOpenspec is true', async () => {
      const { init } = await import('../src/commands/init.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await init({ targetDir: tempDir, withOpenspec: true });

      consoleSpy.mockRestore();

      const commandsDir = path.join(tempDir, '.claude/commands');
      const files = await fs.readdir(commandsDir);

      // Should include OpenSpec-specific commands
      expect(files).toContain('os-apply-iterative.md');
    });
  });

  describe('status command', () => {
    it('should report not installed when no version file exists', async () => {
      const { status } = await import('../src/commands/status.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await status({ targetDir: tempDir });

      // Check that "not installed" message was logged (check before restoring)
      const calls = consoleSpy.mock.calls.flat().join(' ');
      expect(calls).toMatch(/not installed|Not installed/i);

      consoleSpy.mockRestore();
    });

    it('should report version when installed', async () => {
      const { init } = await import('../src/commands/init.js');
      const { status } = await import('../src/commands/status.js');

      // First init
      const initSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await init({ targetDir: tempDir });
      initSpy.mockRestore();

      // Then check status
      const statusSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await status({ targetDir: tempDir });

      // Should have logged version info
      const calls = statusSpy.mock.calls.flat().join(' ');
      expect(calls).toMatch(/version|Version/i);

      statusSpy.mockRestore();
    });
  });

  describe('upgrade command', () => {
    it('should perform fresh install when not previously installed', async () => {
      const { upgrade } = await import('../src/commands/upgrade.js');

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await upgrade({ targetDir: tempDir });

      consoleSpy.mockRestore();

      // Check that files were created
      expect(await fs.pathExists(path.join(tempDir, '.claude'))).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.claude/agents'))).toBe(true);
    });

    it('should report up to date when already at latest version', async () => {
      const { init } = await import('../src/commands/init.js');
      const { upgrade } = await import('../src/commands/upgrade.js');

      // First init
      const initSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await init({ targetDir: tempDir });
      initSpy.mockRestore();

      // Then upgrade without force
      const upgradeSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await upgrade({ targetDir: tempDir, force: false });

      // Should report up to date
      const calls = upgradeSpy.mock.calls.flat().join(' ');
      expect(calls).toMatch(/up to date|Already/i);

      upgradeSpy.mockRestore();
    });

    it('should reinstall when force option is true', async () => {
      const { init } = await import('../src/commands/init.js');
      const { upgrade } = await import('../src/commands/upgrade.js');

      // First init
      const initSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await init({ targetDir: tempDir });
      initSpy.mockRestore();

      // Get original timestamp
      const versionFile = path.join(tempDir, '.claude/iterative-workflow.json');
      const originalInfo = await fs.readJson(versionFile);
      const originalTimestamp = originalInfo.installedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Force upgrade
      const upgradeSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await upgrade({ targetDir: tempDir, force: true });
      upgradeSpy.mockRestore();

      // Check that timestamp changed
      const newInfo = await fs.readJson(versionFile);
      expect(newInfo.installedAt).not.toBe(originalTimestamp);
    });
  });
});

describe('Template Discovery Integration', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'helix-discovery-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should discover all agents after init', async () => {
    const { init } = await import('../src/commands/init.js');
    const { discoverAgents } = await import('../src/utils/agent-discovery.js');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await init({ targetDir: tempDir });
    consoleSpy.mockRestore();

    const agentsDir = path.join(tempDir, '.claude/agents');
    const result = await discoverAgents(agentsDir);

    // Should have discovered multiple agents
    expect(result.agents.length).toBeGreaterThan(5);
    expect(result.errors.length).toBe(0);

    // Check for core agents
    const agentNames = result.agents.map(a => a.name);
    expect(agentNames).toContain('code-writer');
    expect(agentNames).toContain('security-reviewer');
    expect(agentNames).toContain('result-aggregator');
  });

  it('should discover all commands after init', async () => {
    const { init } = await import('../src/commands/init.js');
    const { discoverCommands } = await import('../src/utils/command-discovery.js');

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await init({ targetDir: tempDir });
    consoleSpy.mockRestore();

    const commandsDir = path.join(tempDir, '.claude/commands');
    const result = await discoverCommands(commandsDir);

    // Should have discovered commands
    expect(result.commands.length).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);
  });
});
