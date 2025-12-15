#!/usr/bin/env node

import { Command } from 'commander';
import { init } from '../dist/commands/init.js';
import { upgrade } from '../dist/commands/upgrade.js';
import { status } from '../dist/commands/status.js';
import { FRAMEWORK_VERSION } from '../dist/utils/version.js';

const program = new Command();

program
  .name('iterative-workflow')
  .description('Iterative multi-agent code generation framework for Claude Code')
  .version(FRAMEWORK_VERSION);

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
  .action(status);

program.parse();
