import chalk from 'chalk';
import { copyTemplates } from '../utils/templates.js';

export interface InitOptions {
  withOpenspec?: boolean;
}

/**
 * Initialize the iterative-workflow framework in the current project
 */
export async function init(options: InitOptions = {}): Promise<void> {
  const targetDir = process.cwd();

  console.log(chalk.blue('Initializing iterative code generation framework...'));
  console.log('');

  try {
    await copyTemplates(targetDir, options);

    console.log('');
    console.log(chalk.green('Initialization complete!'));
    console.log('');
    console.log('Installed components:');
    console.log(chalk.cyan('  - 5 specialized agents (code-writer, security-reviewer, quality-checker, performance-analyzer, result-aggregator)'));
    console.log(chalk.cyan('  - /iterative-code command'));
    if (options.withOpenspec) {
      console.log(chalk.cyan('  - /os-apply-iterative command (OpenSpec integration)'));
    }
    console.log(chalk.cyan('  - iterative-workflow skill'));
    console.log('');
    console.log('Usage:');
    console.log(chalk.yellow('  /iterative-code [requirement description]'));
    console.log('');
    console.log('Example:');
    console.log(chalk.gray('  /iterative-code Implement user login with password encryption and JWT generation'));
    console.log('');

    if (options.withOpenspec) {
      console.log('OpenSpec Integration:');
      console.log(chalk.yellow('  /os-apply-iterative [change-id]'));
      console.log('');
      console.log('Note: Run openspec init first to initialize the OpenSpec system');
      console.log('');
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red('Initialization failed:'), message);
    process.exit(1);
  }
}
