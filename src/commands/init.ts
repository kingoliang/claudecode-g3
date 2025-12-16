import chalk from 'chalk';
import { copyTemplates, type TemplateDiscoveryResult } from '../utils/templates.js';
import { formatAgentNames } from '../utils/agent-discovery.js';
import { formatCommandNames } from '../utils/command-discovery.js';
import { formatSkillNames } from '../utils/skill-discovery.js';

export interface InitOptions {
  /** Include OpenSpec integration (defaults to true) */
  withOpenspec?: boolean;
  /** Target directory for initialization (defaults to cwd) */
  targetDir?: string;
}

/**
 * Initialize the Helix framework in the specified project
 * @param options - Initialization options including target directory
 */
export async function init(options: InitOptions = {}): Promise<void> {
  const targetDir = options.targetDir ?? process.cwd();
  const withOpenspec = options.withOpenspec ?? true; // Default to true

  console.log(chalk.blue('Initializing Helix iterative code generation framework...'));
  console.log('');

  try {
    const result: TemplateDiscoveryResult = await copyTemplates(targetDir, { ...options, withOpenspec });
    const agentCount = result.agents.agents.length;
    const agentNames = formatAgentNames(result.agents.agents);
    const commandNames = formatCommandNames(result.commands.commands);
    const skillCount = result.skills.skills.length;
    const skillNames = formatSkillNames(result.skills.skills);

    console.log('');
    console.log(chalk.green('Initialization complete!'));
    console.log('');
    console.log('Installed components:');
    console.log(chalk.cyan(`  - ${agentCount} specialized agents (${agentNames})`));
    console.log(chalk.cyan(`  - Commands: ${commandNames}`));
    console.log(chalk.cyan(`  - ${skillCount} skill${skillCount !== 1 ? 's' : ''} (${skillNames})`));
    console.log('');
    console.log('Usage:');
    console.log(chalk.yellow('  /iterative-code [requirement description]'));
    console.log('');
    console.log('Example:');
    console.log(chalk.gray('  /iterative-code Implement user login with password encryption and JWT generation'));
    console.log('');

    if (withOpenspec) {
      console.log('OpenSpec Integration:');
      console.log(chalk.yellow('  /os-apply-iterative [change-id]'));
      console.log('');
      console.log('Note: Run openspec init first to initialize the OpenSpec system');
      console.log('');
    }

    // Report any discovery errors
    const allErrors = [
      ...result.agents.errors,
      ...result.commands.errors,
      ...result.skills.errors,
    ];
    if (allErrors.length > 0) {
      console.log(chalk.yellow('Warnings:'));
      for (const err of allErrors) {
        console.log(chalk.yellow(`  - ${err.file}: ${err.error}`));
      }
      console.log('');
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red('Initialization failed:'), message);
    console.log('');

    // Provide troubleshooting guidance based on error type
    console.log(chalk.yellow('Troubleshooting:'));

    if (message.includes('Templates directory not found')) {
      console.log('  The templates directory could not be located.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Reinstall the package:');
      console.log(chalk.gray('       npm uninstall -g helix && npm install -g helix'));
      console.log('    2. If using npx, clear the cache:');
      console.log(chalk.gray('       npx clear-npx-cache && npx helix init'));
      console.log('    3. Verify installation:');
      console.log(chalk.gray('       npm list -g helix'));
    } else if (message.includes('EACCES') || message.includes('permission denied') || message.includes('EPERM')) {
      console.log('  Permission denied while writing files.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Check directory permissions:');
      console.log(chalk.gray(`       ls -la "${targetDir}"`));
      console.log('    2. Ensure you own the .claude directory:');
      console.log(chalk.gray(`       sudo chown -R $(whoami) "${targetDir}/.claude"`));
      console.log('    3. Run from a directory you have write access to');
    } else if (message.includes('ENOENT')) {
      console.log('  A required file or directory was not found.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Ensure you are in a valid project directory');
      console.log('    2. Check that the target path exists:');
      console.log(chalk.gray(`       ls -la "${targetDir}"`));
    } else if (message.includes('ENOSPC')) {
      console.log('  Disk space is full.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Free up disk space');
      console.log('    2. Check available space:');
      console.log(chalk.gray('       df -h'));
    } else if (message.includes('EEXIST')) {
      console.log('  Files already exist and could not be overwritten.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Use upgrade command instead:');
      console.log(chalk.gray('       helix upgrade'));
      console.log('    2. Or manually remove existing files:');
      console.log(chalk.gray(`       rm -rf "${targetDir}/.claude/agents" "${targetDir}/.claude/commands"`));
    } else {
      console.log('  An unexpected error occurred.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Check if you have the latest version:');
      console.log(chalk.gray('       npm install -g helix@latest'));
      console.log('    2. Report the issue if it persists:');
      console.log(chalk.gray('       https://github.com/anthropics/helix/issues'));
    }

    console.log('');
    process.exit(1);
  }
}
