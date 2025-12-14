import chalk from 'chalk';
import { checkUpgrade, copyTemplates, getInstalledVersion, FRAMEWORK_VERSION } from '../utils/templates.js';

export interface UpgradeOptions {
  withOpenspec?: boolean;
  force?: boolean;
}

/**
 * Upgrade the iterative-workflow framework in the current project
 */
export async function upgrade(options: UpgradeOptions = {}): Promise<void> {
  const targetDir = process.cwd();

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
    await copyTemplates(targetDir, options);

    console.log('');
    console.log(chalk.green('✓ Upgrade complete!'));
    console.log(`  New version: ${chalk.cyan(FRAMEWORK_VERSION)}`);
    console.log('');

    // Show what was updated
    console.log('Updated components:');
    console.log(chalk.cyan('  - 5 specialized agents'));
    console.log(chalk.cyan('  - /iterative-code command'));
    console.log(chalk.cyan('  - /tech-stack command'));
    if (options.withOpenspec) {
      console.log(chalk.cyan('  - /os-apply-iterative command'));
    }
    console.log(chalk.cyan('  - iterative-workflow skill'));
    console.log('');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red('Upgrade failed:'), message);
    process.exit(1);
  }
}
