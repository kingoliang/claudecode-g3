#!/usr/bin/env node

import { Command } from 'commander';
import { init } from '../dist/commands/init.js';
import { upgrade } from '../dist/commands/upgrade.js';
import { status } from '../dist/commands/status.js';
import { FRAMEWORK_VERSION } from '../dist/utils/version.js';

const program = new Command();

program
  .name('helix')
  .description('Helix - Iterative multi-agent code generation framework for Claude Code')
  .version(FRAMEWORK_VERSION)
  .addHelpText('after', `
Examples:
  $ helix init                    Initialize Helix in your project
  $ helix init --no-openspec      Initialize without OpenSpec integration
  $ helix status                  Check installed version and updates
  $ helix upgrade                 Upgrade to latest version
  $ helix upgrade --force         Force reinstall

Quick Start:
  1. Run 'helix init' in your project directory
  2. Use '/iterative-code [requirement]' in Claude Code
  3. The framework will iteratively generate and improve code

Components Installed:
  - 16 specialized AI agents (code-writer, security-reviewer, etc.)
  - Quality gate system with configurable thresholds
  - Iteration tracking and checkpoint recovery

Documentation:
  https://github.com/anthropics/helix
`);

program
  .command('init')
  .description('Initialize the framework in current project')
  .option('--no-openspec', 'Skip OpenSpec integration commands')
  .option('--with-openspec', 'Include OpenSpec integration commands (default)')
  .addHelpText('after', `
Examples:
  $ helix init                    Full initialization with OpenSpec
  $ helix init --no-openspec      Basic initialization only

This creates the following structure:
  .claude/
  ├── agents/          # 16 specialized AI agents
  ├── commands/        # Slash commands for Claude Code
  ├── skills/          # Skill definitions
  └── iterative-workflow.json  # Version tracking
`)
  .action((options) => {
    // Handle the --no-openspec flag
    const withOpenspec = options.openspec !== false;
    init({ withOpenspec });
  });

program
  .command('upgrade')
  .description('Upgrade the framework templates to the latest version')
  .option('--no-openspec', 'Skip OpenSpec integration commands')
  .option('--with-openspec', 'Include OpenSpec integration commands (default)')
  .option('--force', 'Force reinstall even if already up to date')
  .addHelpText('after', `
Examples:
  $ helix upgrade                 Upgrade if new version available
  $ helix upgrade --force         Force reinstall current version
  $ helix upgrade --no-openspec   Upgrade without OpenSpec commands

Notes:
  - Existing customizations in .claude/ will be overwritten
  - Your project code is never modified
`)
  .action((options) => {
    const withOpenspec = options.openspec !== false;
    upgrade({ withOpenspec, force: options.force });
  });

program
  .command('status')
  .description('Show installed version and check for updates')
  .addHelpText('after', `
Examples:
  $ helix status                  Show version info

Output includes:
  - Currently installed version
  - Latest available version
  - Upgrade status (up-to-date, update available, etc.)
`)
  .action(status);

program.parse();
