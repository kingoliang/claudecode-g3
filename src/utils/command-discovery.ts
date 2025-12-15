import fs from 'fs-extra';
import path from 'path';
import { parseSimpleYaml, extractFrontmatter } from './yaml-parser.js';

/**
 * Command metadata extracted from frontmatter
 */
export interface CommandMetadata {
  /** Command name (derived from filename, e.g., 'iterative-code') */
  name: string;
  /** Command description */
  description: string;
  /** Argument hint for CLI help */
  argumentHint: string;
  /** Original file name */
  fileName: string;
  /** Whether this is an optional/integration command */
  isOptional: boolean;
}

/**
 * Result of command discovery process
 */
export interface CommandDiscoveryResult {
  /** Successfully discovered commands */
  commands: CommandMetadata[];
  /** Errors encountered during discovery */
  errors: Array<{ file: string; error: string }>;
}

/**
 * Required fields in command frontmatter
 */
const REQUIRED_FIELDS = ['description'] as const;

/**
 * Parse command frontmatter from markdown content
 * @param content - Full markdown file content
 * @param fileName - Original file name for error reporting
 * @returns CommandMetadata if valid, null if parsing fails
 */
export function parseCommandFrontmatter(
  content: string,
  fileName: string
): { metadata: CommandMetadata | null; error: string | null } {
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

  // Derive command name from filename
  const name = path.basename(fileName, '.md');

  // Determine if optional based on frontmatter field only
  const isOptional = parsed['optional'] === 'true';

  return {
    metadata: {
      name,
      description: parsed.description,
      argumentHint: parsed['argument-hint'] || '',
      fileName,
      isOptional,
    },
    error: null
  };
}

/**
 * Discover all commands in the specified directory
 * @param commandsDir - Path to commands directory
 * @returns Discovery result with commands and any errors
 */
export async function discoverCommands(commandsDir: string): Promise<CommandDiscoveryResult> {
  const result: CommandDiscoveryResult = {
    commands: [],
    errors: [],
  };

  // Check if directory exists
  if (!await fs.pathExists(commandsDir)) {
    result.errors.push({
      file: commandsDir,
      error: 'Commands directory not found'
    });
    return result;
  }

  // Get all markdown files
  const files = await fs.readdir(commandsDir);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  // Process each file
  for (const fileName of mdFiles) {
    const filePath = path.join(commandsDir, fileName);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { metadata, error } = parseCommandFrontmatter(content, fileName);

      if (metadata) {
        result.commands.push(metadata);
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

  // Sort: required commands first, then alphabetically
  result.commands.sort((a, b) => {
    if (a.isOptional !== b.isOptional) {
      return a.isOptional ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * Filter commands based on options
 * @param commands - List of discovered commands
 * @param options - Filter options
 * @returns Filtered list of commands to copy
 */
export function filterCommands(
  commands: CommandMetadata[],
  options: { withOpenspec?: boolean }
): CommandMetadata[] {
  return commands.filter(cmd => {
    // Always include non-optional commands
    if (!cmd.isOptional) return true;
    // Include optional commands only if withOpenspec is true
    if (cmd.isOptional && options.withOpenspec) return true;
    return false;
  });
}

/**
 * Get command names as a formatted string for display
 * @param commands - List of command metadata
 * @returns Comma-separated string of command names with slash prefix
 */
export function formatCommandNames(commands: CommandMetadata[]): string {
  return commands.map(c => `/${c.name}`).join(', ');
}
