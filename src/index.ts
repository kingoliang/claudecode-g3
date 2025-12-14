/**
 * iterative-workflow - Iterative multi-agent code generation framework for Claude Code
 *
 * This package provides templates (agents, commands, skills) for Claude Code.
 * Tech stack detection is handled by Claude itself through the skill instructions.
 */

// Commands
export { init, type InitOptions } from './commands/init.js';
export { upgrade, type UpgradeOptions } from './commands/upgrade.js';

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
} from './utils/templates.js';
