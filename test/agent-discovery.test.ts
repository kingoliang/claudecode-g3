import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import {
  discoverAgents,
  parseAgentFrontmatter,
  formatAgentNames,
  type AgentMetadata,
} from '../src/utils/agent-discovery.js';

describe('parseAgentFrontmatter', () => {
  it('should parse valid frontmatter', () => {
    const content = `---
name: test-agent
description: A test agent
version: 1.0.0
tools: Read, Write, Bash
model: opus
---

# Test Agent

Some content here.
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test-agent.md');

    expect(error).toBeNull();
    expect(metadata).not.toBeNull();
    expect(metadata!.name).toBe('test-agent');
    expect(metadata!.description).toBe('A test agent');
    expect(metadata!.version).toBe('1.0.0');
    expect(metadata!.tools).toEqual(['Read', 'Write', 'Bash']);
    expect(metadata!.model).toBe('opus');
    expect(metadata!.fileName).toBe('test-agent.md');
  });

  it('should return error when frontmatter is missing', () => {
    const content = `# No Frontmatter

Just plain content.
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test.md');

    expect(metadata).toBeNull();
    expect(error).toBe('No frontmatter found');
  });

  it('should return error when required fields are missing', () => {
    const content = `---
name: test-agent
description: A test agent
---

# Test Agent
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test-agent.md');

    expect(metadata).toBeNull();
    expect(error).toContain('Missing required fields');
    expect(error).toContain('version');
    expect(error).toContain('tools');
    expect(error).toContain('model');
  });

  it('should return error when version format is invalid', () => {
    const content = `---
name: test-agent
description: A test agent
version: invalid
tools: Read
model: opus
---
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test-agent.md');

    expect(metadata).toBeNull();
    expect(error).toContain('Invalid version format');
  });

  it('should return error when name does not match filename', () => {
    const content = `---
name: different-name
description: A test agent
version: 1.0.0
tools: Read
model: opus
---
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test-agent.md');

    expect(metadata).toBeNull();
    expect(error).toContain('Name mismatch');
  });

  it('should handle tools with extra whitespace', () => {
    const content = `---
name: test-agent
description: A test agent
version: 1.0.0
tools: Read ,  Write , Bash
model: opus
---
`;
    const { metadata, error } = parseAgentFrontmatter(content, 'test-agent.md');

    expect(error).toBeNull();
    expect(metadata!.tools).toEqual(['Read', 'Write', 'Bash']);
  });
});

describe('discoverAgents', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-discovery-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should discover valid agents', async () => {
    // Create test agent files
    await fs.writeFile(
      path.join(tempDir, 'agent-a.md'),
      `---
name: agent-a
description: Agent A
version: 1.0.0
tools: Read
model: opus
---
# Agent A
`
    );

    await fs.writeFile(
      path.join(tempDir, 'agent-b.md'),
      `---
name: agent-b
description: Agent B
version: 2.0.0
tools: Write, Edit
model: sonnet
---
# Agent B
`
    );

    const result = await discoverAgents(tempDir);

    expect(result.agents).toHaveLength(2);
    expect(result.errors).toHaveLength(0);

    // Should be sorted alphabetically
    expect(result.agents[0].name).toBe('agent-a');
    expect(result.agents[1].name).toBe('agent-b');
  });

  it('should report errors for invalid agents', async () => {
    // Create valid agent
    await fs.writeFile(
      path.join(tempDir, 'valid-agent.md'),
      `---
name: valid-agent
description: Valid agent
version: 1.0.0
tools: Read
model: opus
---
`
    );

    // Create invalid agent (missing fields)
    await fs.writeFile(
      path.join(tempDir, 'invalid-agent.md'),
      `---
name: invalid-agent
---
`
    );

    const result = await discoverAgents(tempDir);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe('valid-agent');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].file).toBe('invalid-agent.md');
  });

  it('should handle non-existent directory', async () => {
    const result = await discoverAgents('/non/existent/path');

    expect(result.agents).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('not found');
  });

  it('should ignore non-markdown files', async () => {
    await fs.writeFile(path.join(tempDir, 'readme.txt'), 'Not a markdown file');
    await fs.writeFile(
      path.join(tempDir, 'agent.md'),
      `---
name: agent
description: Agent
version: 1.0.0
tools: Read
model: opus
---
`
    );

    const result = await discoverAgents(tempDir);

    expect(result.agents).toHaveLength(1);
    expect(result.agents[0].name).toBe('agent');
  });
});

describe('formatAgentNames', () => {
  it('should format agent names as comma-separated string', () => {
    const agents: AgentMetadata[] = [
      { name: 'agent-a', description: '', version: '1.0.0', tools: [], model: 'opus', fileName: 'agent-a.md' },
      { name: 'agent-b', description: '', version: '1.0.0', tools: [], model: 'opus', fileName: 'agent-b.md' },
      { name: 'agent-c', description: '', version: '1.0.0', tools: [], model: 'opus', fileName: 'agent-c.md' },
    ];

    const result = formatAgentNames(agents);

    expect(result).toBe('agent-a, agent-b, agent-c');
  });

  it('should return empty string for empty array', () => {
    const result = formatAgentNames([]);
    expect(result).toBe('');
  });
});

describe('discoverAgents with real templates', () => {
  it('should discover all 5 agents from templates directory', async () => {
    // Use the actual templates directory
    const templatesDir = path.join(__dirname, '../templates/agents');

    // Skip if templates directory doesn't exist (CI environment)
    if (!await fs.pathExists(templatesDir)) {
      return;
    }

    const result = await discoverAgents(templatesDir);

    expect(result.agents.length).toBeGreaterThanOrEqual(5);
    expect(result.errors).toHaveLength(0);

    // Check for known agents
    const agentNames = result.agents.map(a => a.name);
    expect(agentNames).toContain('code-writer');
    expect(agentNames).toContain('security-reviewer');
    expect(agentNames).toContain('quality-checker');
    expect(agentNames).toContain('performance-analyzer');
    expect(agentNames).toContain('result-aggregator');
  });
});
