import fs from 'fs-extra';
import path from 'path';
import { parseSimpleYaml, extractFrontmatter } from './yaml-parser.js';

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
 * Required fields in agent frontmatter
 */
const REQUIRED_FIELDS = ['name', 'description', 'version', 'tools', 'model'] as const;

/**
 * Parse agent frontmatter from markdown content
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

  // Validate required fields
  const missingFields: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    if (!parsed[field]) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      metadata: null,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  // Parse tools string into array
  const tools = parsed.tools
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Validate version format (basic semver check)
  const versionRegex = /^\d+\.\d+\.\d+/;
  if (!versionRegex.test(parsed.version)) {
    return {
      metadata: null,
      error: `Invalid version format: ${parsed.version}`
    };
  }

  // Validate name matches filename (without extension)
  const expectedName = path.basename(fileName, '.md');
  if (parsed.name !== expectedName) {
    return {
      metadata: null,
      error: `Name mismatch: frontmatter name '${parsed.name}' does not match filename '${expectedName}'`
    };
  }

  return {
    metadata: {
      name: parsed.name,
      description: parsed.description,
      version: parsed.version,
      tools,
      model: parsed.model,
      fileName,
    },
    error: null
  };
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
