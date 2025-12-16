import fs from 'fs-extra';
import path from 'path';
import { z } from 'zod';
import { parseSimpleYaml, extractFrontmatter } from './yaml-parser.js';

/**
 * Agent category for grouping
 */
export type AgentCategory =
  | 'core'          // Original Helix agents (code-writer, reviewers, etc.)
  | 'research'      // Research agents (deep-researcher)
  | 'design'        // Design agents (system-architect)
  | 'management'    // Management agents (pm-agent)
  | 'domain'        // Domain-specific experts (frontend, backend, etc.)
  | 'specialized';  // Specialized agents (security, performance, etc.)

/**
 * Agent source framework
 */
export type AgentSource = 'helix' | 'superclaude';

/**
 * Agent metadata extracted from frontmatter
 */
export interface AgentMetadata {
  /** Unique agent identifier (e.g., 'code-writer') */
  name: string;
  /** Agent description */
  description: string;
  /** Agent version (semver format) */
  version: string;
  /** Available tools for this agent */
  tools: string[];
  /** Claude model to use */
  model: string;
  /** Original file name */
  fileName: string;
  /** Agent category for grouping */
  category?: AgentCategory;
  /** Source framework */
  source?: AgentSource;
}

/**
 * Result of agent discovery process
 */
export interface DiscoveryResult {
  /** Successfully discovered agents */
  agents: AgentMetadata[];
  /** Errors encountered during discovery */
  errors: Array<{ file: string; error: string }>;
}

/**
 * Grouped agents by category
 */
export interface GroupedAgents {
  core: AgentMetadata[];
  research: AgentMetadata[];
  design: AgentMetadata[];
  management: AgentMetadata[];
  domain: AgentMetadata[];
  specialized: AgentMetadata[];
}

/**
 * Valid Claude models for agents
 */
export const VALID_MODELS = ['opus', 'sonnet', 'haiku'] as const;
export type AgentModel = typeof VALID_MODELS[number];

/**
 * Zod schema for agent frontmatter validation
 */
export const AgentFrontmatterSchema = z.object({
  name: z.string().min(1, 'Agent name is required').regex(/^[a-z0-9-]+$/, 'Agent name must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must be in semver format (e.g., 1.0.0)'),
  tools: z.string().min(1, 'At least one tool must be specified'),
  model: z.enum(VALID_MODELS, { errorMap: () => ({ message: `Model must be one of: ${VALID_MODELS.join(', ')}` }) }),
  category: z.enum(['core', 'research', 'design', 'management', 'domain', 'specialized']).optional(),
  source: z.enum(['helix', 'superclaude']).optional(),
});

export type AgentFrontmatter = z.infer<typeof AgentFrontmatterSchema>;

/**
 * Parse agent frontmatter from markdown content with Zod validation
 * @param content - Full markdown file content
 * @param fileName - Original file name for error reporting
 * @returns AgentMetadata if valid, null if parsing fails
 */
export function parseAgentFrontmatter(
  content: string,
  fileName: string
): { metadata: AgentMetadata | null; error: string | null } {
  const yamlContent = extractFrontmatter(content);

  if (!yamlContent) {
    return { metadata: null, error: 'No frontmatter found' };
  }

  const parsed = parseSimpleYaml(yamlContent);

  // Validate with Zod schema
  const validation = AgentFrontmatterSchema.safeParse(parsed);

  if (!validation.success) {
    const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return {
      metadata: null,
      error: errors.join('; ')
    };
  }

  const data = validation.data;

  // Validate name matches filename (without extension)
  const expectedName = path.basename(fileName, '.md');
  if (data.name !== expectedName) {
    return {
      metadata: null,
      error: `Name mismatch: frontmatter name '${data.name}' does not match filename '${expectedName}'`
    };
  }

  // Parse tools string into array
  const tools = data.tools
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  return {
    metadata: {
      name: data.name,
      description: data.description,
      version: data.version,
      tools,
      model: data.model,
      fileName,
      category: data.category || inferCategory(data.name),
      source: data.source || 'helix',
    },
    error: null
  };
}

/**
 * Infer agent category from name if not specified
 */
function inferCategory(name: string): AgentCategory {
  // Core Helix agents
  if (['code-writer', 'security-reviewer', 'quality-checker', 'performance-analyzer', 'result-aggregator'].includes(name)) {
    return 'core';
  }

  // Research agents
  if (name.includes('research') || name.includes('researcher')) {
    return 'research';
  }

  // Design agents
  if (name.includes('architect') || name.includes('design')) {
    return 'design';
  }

  // Management agents
  if (name.includes('pm') || name.includes('manager')) {
    return 'management';
  }

  // Domain experts
  if (['testing-specialist'].includes(name)) {
    return 'domain';
  }

  // Default to specialized
  return 'specialized';
}

/**
 * Discover all agents in the specified directory
 * @param agentsDir - Path to agents directory
 * @returns Discovery result with agents and any errors
 */
export async function discoverAgents(agentsDir: string): Promise<DiscoveryResult> {
  const result: DiscoveryResult = {
    agents: [],
    errors: [],
  };

  // Check if directory exists
  if (!await fs.pathExists(agentsDir)) {
    result.errors.push({
      file: agentsDir,
      error: 'Agents directory not found'
    });
    return result;
  }

  // Get all markdown files
  const files = await fs.readdir(agentsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  // Process each file
  for (const fileName of mdFiles) {
    const filePath = path.join(agentsDir, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { metadata, error } = parseAgentFrontmatter(content, fileName);

      if (metadata) {
        result.agents.push(metadata);
      } else if (error) {
        result.errors.push({ file: fileName, error });
      }
    } catch (err) {
      result.errors.push({
        file: fileName,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Sort agents by name for consistent ordering
  result.agents.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

/**
 * Get agent names as a formatted string for display
 * @param agents - List of agent metadata
 * @returns Comma-separated string of agent names
 */
export function formatAgentNames(agents: AgentMetadata[]): string {
  return agents.map(a => a.name).join(', ');
}

/**
 * Group agents by category
 * @param agents - List of agent metadata
 * @returns Agents grouped by category
 */
export function groupAgentsByCategory(agents: AgentMetadata[]): GroupedAgents {
  const grouped: GroupedAgents = {
    core: [],
    research: [],
    design: [],
    management: [],
    domain: [],
    specialized: [],
  };

  for (const agent of agents) {
    const category = agent.category || 'specialized';
    grouped[category].push(agent);
  }

  // Sort each group by name
  for (const category of Object.keys(grouped) as AgentCategory[]) {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return grouped;
}

/**
 * Filter agents by source framework
 * @param agents - List of agent metadata
 * @param source - Source framework to filter by
 * @returns Filtered agents
 */
export function filterAgentsBySource(
  agents: AgentMetadata[],
  source: AgentSource
): AgentMetadata[] {
  return agents.filter(a => a.source === source);
}

/**
 * Filter agents by category
 * @param agents - List of agent metadata
 * @param categories - Categories to include
 * @returns Filtered agents
 */
export function filterAgentsByCategory(
  agents: AgentMetadata[],
  categories: AgentCategory[]
): AgentMetadata[] {
  return agents.filter(a => categories.includes(a.category || 'specialized'));
}

/**
 * Get agent summary statistics
 * @param agents - List of agent metadata
 * @returns Summary statistics
 */
export function getAgentStats(agents: AgentMetadata[]): {
  total: number;
  byCategory: Record<AgentCategory, number>;
  bySource: Record<AgentSource, number>;
} {
  const stats = {
    total: agents.length,
    byCategory: {
      core: 0,
      research: 0,
      design: 0,
      management: 0,
      domain: 0,
      specialized: 0,
    } as Record<AgentCategory, number>,
    bySource: {
      helix: 0,
      superclaude: 0,
    } as Record<AgentSource, number>,
  };

  for (const agent of agents) {
    const category = agent.category || 'specialized';
    const source = agent.source || 'helix';
    stats.byCategory[category]++;
    stats.bySource[source]++;
  }

  return stats;
}
