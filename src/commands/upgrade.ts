import chalk from 'chalk';
import { checkUpgrade, copyTemplates, getInstalledVersion, FRAMEWORK_VERSION, type TemplateDiscoveryResult } from '../utils/templates.js';
import { formatCommandNames } from '../utils/command-discovery.js';
import { formatSkillNames } from '../utils/skill-discovery.js';

export interface UpgradeOptions {
  withOpenspec?: boolean;
  force?: boolean;
  /** Target directory for upgrade (defaults to cwd) */
  targetDir?: string;
}

/**
 * Upgrade the iterative-workflow framework in the specified project
 * @param options - Upgrade options including target directory
 */
export async function upgrade(options: UpgradeOptions = {}): Promise<void> {
  const targetDir = options.targetDir ?? process.cwd();

  console.log(chalk.blue('Checking for iterative-workflow updates...'));
  console.log('');

  try {
    const upgradeInfo = await checkUpgrade(targetDir);
    const installed = await getInstalledVersion(targetDir);

    if (!upgradeInfo.needsUpgrade && !options.force) {
      console.log(chalk.green('✓ Already up to date!'));
      console.log(`  Current version: ${chalk.cyan(FRAMEWORK_VERSION)}`);
      if (installed) {
        console.log(`  Installed at: ${chalk.gray(installed.installedAt)}`);
      }
      console.log('');
      console.log(chalk.gray('Use --force to reinstall anyway.'));
      return;
    }

    if (installed) {
      console.log(`  Current version: ${chalk.yellow(installed.version)}`);
      console.log(`  Available version: ${chalk.green(FRAMEWORK_VERSION)}`);
      console.log('');
    } else {
      console.log(chalk.yellow('  No version info found. Performing fresh install.'));
      console.log('');
    }

    console.log(chalk.blue('Upgrading templates...'));
    const result: TemplateDiscoveryResult = await copyTemplates(targetDir, options);
    const agentCount = result.agents.agents.length;
    const commandNames = formatCommandNames(result.commands.commands);
    const skillCount = result.skills.skills.length;
    const skillNames = formatSkillNames(result.skills.skills);

    console.log('');
    console.log(chalk.green('✓ Upgrade complete!'));
    console.log(`  New version: ${chalk.cyan(FRAMEWORK_VERSION)}`);
    console.log('');

    // Show what was updated
    console.log('Updated components:');
    console.log(chalk.cyan(`  - ${agentCount} specialized agents`));
    console.log(chalk.cyan(`  - Commands: ${commandNames}`));
    console.log(chalk.cyan(`  - ${skillCount} skill${skillCount !== 1 ? 's' : ''} (${skillNames})`));
    console.log('');

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
    console.log(chalk.red('Upgrade failed:'), message);
    process.exit(1);
  }
}
