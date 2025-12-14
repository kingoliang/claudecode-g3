#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { init } from '../dist/commands/init.js';
import { upgrade } from '../dist/commands/upgrade.js';
import { checkUpgrade, getInstalledVersion, FRAMEWORK_VERSION } from '../dist/utils/templates.js';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json (single source of truth)
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('iterative-workflow')
  .description('Iterative multi-agent code generation framework for Claude Code')
  .version(pkg.version);

program
  .command('init')
  .description('Initialize the framework in current project')
  .option('--with-openspec', 'Include OpenSpec integration commands')
  .action(init);

program
  .command('upgrade')
  .description('Upgrade the framework templates to the latest version')
  .option('--with-openspec', 'Include OpenSpec integration commands')
  .option('--force', 'Force reinstall even if already up to date')
  .action(upgrade);

program
  .command('status')
  .description('Show installed version and check for updates')
  .action(async () => {
    const targetDir = process.cwd();
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
  });

program.parse();
