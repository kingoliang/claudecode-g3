/**
 * iterative-workflow - Iterative multi-agent code generation framework for Claude Code
 *
 * This package provides templates (agents, commands, skills) for Claude Code.
 * Tech stack detection is handled by Claude itself through the skill instructions.
 */

// Commands
export { init, type InitOptions } from './commands/init.js';
export { upgrade, type UpgradeOptions } from './commands/upgrade.js';
export { status } from './commands/status.js';

// Template management
export {
  copyTemplates,
  getTemplatesDir,
  getTemplatesDirInfo,
  getInstalledVersion,
  checkUpgrade,
  FRAMEWORK_VERSION,
  type CopyOptions,
  type TemplatesInfo,
  type VersionInfo,
  type TemplateDiscoveryResult,
  type UpgradeStatus,
} from './utils/templates.js';

// Agent discovery
export {
  discoverAgents,
  parseAgentFrontmatter,
  formatAgentNames,
  type AgentMetadata,
  type DiscoveryResult,
} from './utils/agent-discovery.js';

// Command discovery
export {
  discoverCommands,
  parseCommandFrontmatter,
  filterCommands,
  formatCommandNames,
  type CommandMetadata,
  type CommandDiscoveryResult,
} from './utils/command-discovery.js';

// Skill discovery
export {
  discoverSkills,
  parseSkillFrontmatter,
  formatSkillNames,
  type SkillMetadata,
  type SkillDiscoveryResult,
} from './utils/skill-discovery.js';

// YAML parsing utilities
export {
  parseSimpleYaml,
  extractFrontmatter,
  FRONTMATTER_REGEX,
} from './utils/yaml-parser.js';
