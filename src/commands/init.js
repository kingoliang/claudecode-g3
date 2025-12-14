const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

async function init(options) {
  const targetDir = process.cwd();
  const templatesDir = path.join(__dirname, '../../templates');

  console.log(chalk.blue('正在初始化迭代式代码生成框架...'));
  console.log('');

  try {
    // 检查模板目录是否存在
    if (!await fs.pathExists(templatesDir)) {
      console.log(chalk.red('错误: 模板目录不存在'));
      process.exit(1);
    }

    // 创建目录
    await fs.ensureDir(path.join(targetDir, '.claude/agents'));
    await fs.ensureDir(path.join(targetDir, '.claude/commands'));
    await fs.ensureDir(path.join(targetDir, '.claude/skills/iterative-workflow'));

    // 复制 agents
    console.log(chalk.gray('  复制 agents...'));
    await fs.copy(
      path.join(templatesDir, 'agents'),
      path.join(targetDir, '.claude/agents')
    );

    // 复制 commands
    console.log(chalk.gray('  复制 commands...'));
    await fs.copy(
      path.join(templatesDir, 'commands', 'iterative-code.md'),
      path.join(targetDir, '.claude/commands', 'iterative-code.md')
    );

    if (options.withOpenspec) {
      await fs.copy(
        path.join(templatesDir, 'commands', 'os-apply-iterative.md'),
        path.join(targetDir, '.claude/commands', 'os-apply-iterative.md')
      );
    }

    // 复制 skills
    console.log(chalk.gray('  复制 skills...'));
    await fs.copy(
      path.join(templatesDir, 'skills'),
      path.join(targetDir, '.claude/skills')
    );

    console.log('');
    console.log(chalk.green('✅ 初始化完成！'));
    console.log('');
    console.log('已安装以下组件:');
    console.log(chalk.cyan('  • 5 个专业化 Agent (code-writer, security-reviewer, quality-checker, performance-analyzer, result-aggregator)'));
    console.log(chalk.cyan('  • /iterative-code 命令'));
    if (options.withOpenspec) {
      console.log(chalk.cyan('  • /os-apply-iterative 命令 (OpenSpec 集成)'));
    }
    console.log(chalk.cyan('  • iterative-workflow 技能'));
    console.log('');
    console.log('使用方法:');
    console.log(chalk.yellow('  /iterative-code [需求描述]'));
    console.log('');
    console.log('示例:');
    console.log(chalk.gray('  /iterative-code 实现用户登录功能，包含密码加密和JWT生成'));
    console.log('');

    if (options.withOpenspec) {
      console.log('OpenSpec 集成:');
      console.log(chalk.yellow('  /os-apply-iterative [change-id]'));
      console.log('');
      console.log('注意: 需要先运行 openspec init 初始化 OpenSpec 系统');
      console.log('');
    }

  } catch (error) {
    console.log(chalk.red('初始化失败:'), error.message);
    process.exit(1);
  }
}

module.exports = init;
