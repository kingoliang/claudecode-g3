#!/usr/bin/env node

/**
 * Build script for iterative-workflow
 */

import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function build() {
  console.log('Building iterative-workflow...');

  // Clean dist directory
  const distDir = path.join(rootDir, 'dist');
  if (await fs.pathExists(distDir)) {
    console.log('Cleaning dist directory...');
    await fs.remove(distDir);
  }

  // Run TypeScript compiler
  console.log('Compiling TypeScript...');
  execSync('npx tsc', { cwd: rootDir, stdio: 'inherit' });

  // Copy templates to dist for production use
  console.log('Copying templates...');
  await fs.copy(
    path.join(rootDir, 'templates'),
    path.join(distDir, 'templates')
  );

  console.log('Build complete!');
}

build().catch(error => {
  console.error('Build failed:', error);
  process.exit(1);
});
