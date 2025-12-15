import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  discoverCommands,
  parseCommandFrontmatter,
  filterCommands,
  formatCommandNames,
  type CommandMetadata,
} from '../src/utils/command-discovery.js';

describe('parseCommandFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
description: Test command description
argument-hint: [test-arg]
---

# Test Command

Some content here.
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'test-command.md');

    expect(error).toBeNull();
    expect(metadata).not.toBeNull();
    expect(metadata!.name).toBe('test-command');
    expect(metadata!.description).toBe('Test command description');
    expect(metadata!.argumentHint).toBe('[test-arg]');
    expect(metadata!.fileName).toBe('test-command.md');
    expect(metadata!.isOptional).toBe(false);
  });

  it('should not automatically mark os- prefix commands as optional', () => {
    const content = `---
description: OpenSpec command
---
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'os-apply.md');

    expect(error).toBeNull();
    expect(metadata!.name).toBe('os-apply');
    // os- prefix alone does not make a command optional; requires explicit optional: true
    expect(metadata!.isOptional).toBe(false);
  });

  it('should detect optional commands by optional field', () => {
    const content = `---
description: Optional command
optional: true
---
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'some-command.md');

    expect(error).toBeNull();
    expect(metadata!.isOptional).toBe(true);
  });

  it('should return error when frontmatter is missing', () => {
    const content = `# No Frontmatter

Just plain content.
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'test.md');

    expect(metadata).toBeNull();
    expect(error).toBe('No frontmatter found');
  });

  it('should return error when description is missing', () => {
    const content = `---
argument-hint: [test]
---
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'test.md');

    expect(metadata).toBeNull();
    expect(error).toContain('Missing required fields');
    expect(error).toContain('description');
  });

  it('should handle missing argument-hint gracefully', () => {
    const content = `---
description: Command without hint
---
`;
    const { metadata, error } = parseCommandFrontmatter(content, 'simple.md');

    expect(error).toBeNull();
    expect(metadata!.argumentHint).toBe('');
  });
});

describe('discoverCommands', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'command-discovery-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should discover valid commands', async () => {
    // Create test command files
    await fs.writeFile(
      path.join(tempDir, 'command-a.md'),
      `---
description: Command A description
---
# Command A
`
    );

    await fs.writeFile(
      path.join(tempDir, 'command-b.md'),
      `---
description: Command B description
argument-hint: [arg]
---
# Command B
`
    );

    const result = await discoverCommands(tempDir);

    expect(result.commands).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    // Should be sorted alphabetically (both non-optional)
    expect(result.commands[0].name).toBe('command-a');
    expect(result.commands[1].name).toBe('command-b');
  });

  it('should sort optional commands after required ones', async () => {
    await fs.writeFile(
      path.join(tempDir, 'optional-cmd.md'),
      `---
description: Optional command
optional: true
---
`
    );

    await fs.writeFile(
      path.join(tempDir, 'required.md'),
      `---
description: Required command
---
`
    );

    const result = await discoverCommands(tempDir);

    expect(result.commands).toHaveLength(2);
    // Required first, then optional
    expect(result.commands[0].name).toBe('required');
    expect(result.commands[0].isOptional).toBe(false);
    expect(result.commands[1].name).toBe('optional-cmd');
    expect(result.commands[1].isOptional).toBe(true);
  });

  it('should report errors for invalid commands', async () => {
    // Create valid command
    await fs.writeFile(
      path.join(tempDir, 'valid-command.md'),
      `---
description: Valid command
---
`
    );

    // Create invalid command (missing description)
    await fs.writeFile(
      path.join(tempDir, 'invalid-command.md'),
      `---
argument-hint: [test]
---
`
    );

    const result = await discoverCommands(tempDir);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe('valid-command');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe('invalid-command.md');
  });

  it('should handle non-existent directory', async () => {
    const result = await discoverCommands('/non/existent/path');

    expect(result.commands).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('not found');
  });

  it('should ignore non-markdown files', async () => {
    await fs.writeFile(path.join(tempDir, 'readme.txt'), 'Not a markdown file');
    await fs.writeFile(
      path.join(tempDir, 'command.md'),
      `---
description: Command description
---
`
    );

    const result = await discoverCommands(tempDir);

    expect(result.commands).toHaveLength(1);
    expect(result.commands[0].name).toBe('command');
  });
});

describe('filterCommands', () => {
  const commands: CommandMetadata[] = [
    { name: 'iterative-code', description: 'Main command', argumentHint: '', fileName: 'iterative-code.md', isOptional: false },
    { name: 'tech-stack', description: 'Tech stack command', argumentHint: '', fileName: 'tech-stack.md', isOptional: false },
    { name: 'os-apply-iterative', description: 'OpenSpec command', argumentHint: '', fileName: 'os-apply-iterative.md', isOptional: true },
  ];

  it('should include only required commands by default', () => {
    const filtered = filterCommands(commands, {});

    expect(filtered).toHaveLength(2);
    expect(filtered.map(c => c.name)).toEqual(['iterative-code', 'tech-stack']);
  });

  it('should include openspec commands when requested', () => {
    const filtered = filterCommands(commands, { withOpenspec: true });

    expect(filtered).toHaveLength(3);
    expect(filtered.map(c => c.name)).toContain('os-apply-iterative');
  });

  it('should return empty array for empty input', () => {
    const filtered = filterCommands([], {});
    expect(filtered).toHaveLength(0);
  });
});

describe('formatCommandNames', () => {
  it('should format command names with slash prefix', () => {
    const commands: CommandMetadata[] = [
      { name: 'iterative-code', description: '', argumentHint: '', fileName: '', isOptional: false },
      { name: 'tech-stack', description: '', argumentHint: '', fileName: '', isOptional: false },
    ];

    const result = formatCommandNames(commands);

    expect(result).toBe('/iterative-code, /tech-stack');
  });

  it('should return empty string for empty array', () => {
    const result = formatCommandNames([]);
    expect(result).toBe('');
  });
});

describe('discoverCommands with real templates', () => {
  it('should discover all commands from templates directory', async () => {
    // Use the actual templates directory
    const templatesDir = path.join(__dirname, '../templates/commands');

    // Skip if templates directory doesn't exist (CI environment)
    if (!await fs.pathExists(templatesDir)) {
      return;
    }

    const result = await discoverCommands(templatesDir);

    expect(result.commands.length).toBeGreaterThanOrEqual(3);
    expect(result.errors).toHaveLength(0);

    // Check for known commands
    const commandNames = result.commands.map(c => c.name);
    expect(commandNames).toContain('iterative-code');
    expect(commandNames).toContain('tech-stack');
    expect(commandNames).toContain('os-apply-iterative');

    // os-apply-iterative should be marked as optional
    const osApply = result.commands.find(c => c.name === 'os-apply-iterative');
    expect(osApply?.isOptional).toBe(true);
  });
});
