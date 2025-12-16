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
    process.exit(1);
  }
}
