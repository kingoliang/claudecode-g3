import fs from 'fs-extra';
import path from 'path';
import { parseSimpleYaml, extractFrontmatter } from './yaml-parser.js';

/**
 * Skill metadata extracted from frontmatter
 */
export interface SkillMetadata {
  /** Unique skill identifier (e.g., 'iterative-workflow') */
  name: string;
  /** Skill description */
  description: string;
  /** Skill version (optional) */
  version?: string;
  /** Original file path relative to skills directory */
  filePath: string;
}

/**
 * Result of skill discovery process
 */
export interface SkillDiscoveryResult {
  /** Successfully discovered skills */
  skills: SkillMetadata[];
  /** Errors encountered during discovery */
  errors: Array<{ file: string; error: string }>;
}

/**
 * Parse skill frontmatter from markdown content
 * Skills have more relaxed requirements - only name and description needed
 *
 * @param content - Full markdown file content
 * @param filePath - Relative file path for reporting
 * @returns SkillMetadata if valid, null if parsing fails
 */
export function parseSkillFrontmatter(
  content: string,
  filePath: string
): { metadata: SkillMetadata | null; error: string | null } {
  const yamlContent = extractFrontmatter(content);

  if (!yamlContent) {
    return { metadata: null, error: 'No frontmatter found' };
  }

  const parsed = parseSimpleYaml(yamlContent);

  // Only name and description are required
  if (!parsed.name) {
    return { metadata: null, error: 'Missing required field: name' };
  }

  if (!parsed.description) {
    return { metadata: null, error: 'Missing required field: description' };
  }

  return {
    metadata: {
      name: parsed.name,
      description: parsed.description,
      version: parsed.version,
      filePath,
    },
    error: null,
  };
}

/**
 * Recursively discover all skills in the specified directory
 * Skills can be organized in subdirectories (e.g., skills/iterative-workflow/SKILL.md)
 *
 * @param skillsDir - Path to skills directory
 * @returns Discovery result with skills and any errors
 */
export async function discoverSkills(skillsDir: string): Promise<SkillDiscoveryResult> {
  const result: SkillDiscoveryResult = {
    skills: [],
    errors: [],
  };

  // Check if directory exists
  if (!await fs.pathExists(skillsDir)) {
    result.errors.push({
      file: skillsDir,
      error: 'Skills directory not found',
    });
    return result;
  }

  // Recursively find all markdown files
  await discoverSkillsRecursive(skillsDir, skillsDir, result);

  // Sort skills by name for consistent ordering
  result.skills.sort((a, b) => a.name.localeCompare(b.name));

  return result;
}

/**
 * Recursively scan directory for skill files
 */
async function discoverSkillsRecursive(
  baseDir: string,
  currentDir: string,
  result: SkillDiscoveryResult
): Promise<void> {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      await discoverSkillsRecursive(baseDir, fullPath, result);
    } else if (entry.name.endsWith('.md')) {
      // Process markdown files
      const relativePath = path.relative(baseDir, fullPath);

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const { metadata, error } = parseSkillFrontmatter(content, relativePath);

        if (metadata) {
          result.skills.push(metadata);
        } else if (error) {
          result.errors.push({ file: relativePath, error });
        }
      } catch (err) {
        result.errors.push({
          file: relativePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Get skill names as a formatted string for display
 * @param skills - List of skill metadata
 * @returns Comma-separated string of skill names
 */
export function formatSkillNames(skills: SkillMetadata[]): string {
  return skills.map(s => s.name).join(', ');
}
