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
    console.log('');

    // Provide troubleshooting guidance
    console.log(chalk.yellow('Troubleshooting:'));

    if (message.includes('Templates directory not found')) {
      console.log('  The templates directory could not be located.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Reinstall the package:');
      console.log(chalk.gray('       npm uninstall -g helix && npm install -g helix'));
      console.log('    2. Then run init instead:');
      console.log(chalk.gray('       helix init'));
    } else if (message.includes('EACCES') || message.includes('permission denied') || message.includes('EPERM')) {
      console.log('  Permission denied while writing files.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Check .claude directory permissions:');
      console.log(chalk.gray(`       ls -la "${targetDir}/.claude"`));
      console.log('    2. Fix ownership if needed:');
      console.log(chalk.gray(`       sudo chown -R $(whoami) "${targetDir}/.claude"`));
    } else if (message.includes('version')) {
      console.log('  Version check failed.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Force reinstall:');
      console.log(chalk.gray('       helix upgrade --force'));
      console.log('    2. Or reinitialize:');
      console.log(chalk.gray('       helix init'));
    } else {
      console.log('  An unexpected error occurred.');
      console.log('');
      console.log('  Try the following:');
      console.log('    1. Force reinstall:');
      console.log(chalk.gray('       helix upgrade --force'));
      console.log('    2. Check if you have the latest version:');
      console.log(chalk.gray('       npm install -g helix@latest'));
      console.log('    3. Report the issue if it persists:');
      console.log(chalk.gray('       https://github.com/anthropics/helix/issues'));
    }

    console.log('');
    process.exit(1);
  }
}
