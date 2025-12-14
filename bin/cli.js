#!/usr/bin/env node

const { program } = require('commander');
const init = require('../src/commands/init');

program
  .name('iterative-workflow')
  .description('迭代式多 Agent 代码生成框架')
  .version('1.0.0');

program
  .command('init')
  .description('初始化框架到当前项目')
  .option('--with-openspec', '同时包含 OpenSpec 集成命令')
  .action(init);

program.parse();
