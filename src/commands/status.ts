import chalk from 'chalk';
import { checkUpgrade, getInstalledVersion, FRAMEWORK_VERSION } from '../utils/templates.js';

export interface StatusOptions {
  targetDir?: string;
}

/**
 * Show installed version and check for updates
 */
export async function status(options: StatusOptions = {}): Promise<void> {
  const targetDir = options.targetDir || process.cwd();
  const installed = await getInstalledVersion(targetDir);
  const upgradeInfo = await checkUpgrade(targetDir);

  console.log('');
  console.log(chalk.bold('iterative-workflow status'));
  console.log('');

  if (installed) {
    console.log(`  Installed version: ${chalk.cyan(installed.version)}`);
    console.log(`  Installed at: ${chalk.gray(installed.installedAt)}`);
    console.log(`  Source: ${chalk.gray(installed.source)}`);
    console.log('');
    console.log('  Components:');
    console.log(`    Agents: ${chalk.gray(installed.components.agents.length)}`);
    console.log(`    Commands: ${chalk.gray(installed.components.commands.join(', '))}`);
    console.log(`    Skills: ${chalk.gray(installed.components.skills.length)}`);
  } else {
    console.log(chalk.yellow('  Not installed in this project.'));
    console.log(`  Run ${chalk.cyan('iterative-workflow init')} to install.`);
  }

  console.log('');
  console.log(`  Framework version: ${chalk.cyan(FRAMEWORK_VERSION)}`);

  if (upgradeInfo.needsUpgrade) {
    console.log('');
    console.log(chalk.yellow(`  ⚠ Update available: ${upgradeInfo.currentVersion || 'none'} → ${upgradeInfo.availableVersion}`));
    console.log(`  Run ${chalk.cyan('iterative-workflow upgrade')} to update.`);
  } else if (installed) {
    console.log(chalk.green('  ✓ Up to date'));
  }

  console.log('');
}
