import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Current framework version */
export const FRAMEWORK_VERSION = '1.0.0';

export interface CopyOptions {
  withOpenspec?: boolean;
}

export interface TemplatesInfo {
  path: string;
  source: 'development' | 'production' | 'node_modules' | 'global';
}

/**
 * Get the templates directory path with enhanced robustness
 * Searches multiple possible locations and returns the first valid one
 */
export function getTemplatesDir(): string {
  const info = getTemplatesDirInfo();
  return info.path;
}

/**
 * Get detailed information about templates directory location
 */
export function getTemplatesDirInfo(): TemplatesInfo {
  const candidates: Array<{ path: string; source: TemplatesInfo['source'] }> = [
    // Development: relative to src/utils
    { path: path.join(__dirname, '../../templates'), source: 'development' },
    // Production: relative to dist/utils
    { path: path.join(__dirname, '../templates'), source: 'production' },
    // Fallback: node_modules in current working directory
    { path: path.join(process.cwd(), 'node_modules/iterative-workflow/templates'), source: 'node_modules' },
    // Global npm installation (common paths)
    { path: path.join('/usr/local/lib/node_modules/iterative-workflow/templates'), source: 'global' },
    { path: path.join(process.env.HOME || '', '.npm-global/lib/node_modules/iterative-workflow/templates'), source: 'global' },
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate.path)) {
      return candidate;
    }
  }

  // Build helpful error message
  const triedPaths = candidates.map(c => `  - ${c.path} (${c.source})`).join('\n');
  throw new Error(
    `Templates directory not found. Searched locations:\n${triedPaths}\n\n` +
    `Please ensure iterative-workflow is properly installed.`
  );
}

export interface VersionInfo {
  version: string;
  installedAt: string;
  source: TemplatesInfo['source'];
  components: {
    agents: string[];
    commands: string[];
    skills: string[];
  };
}

/**
 * Get the version info file path
 */
function getVersionFilePath(targetDir: string): string {
  return path.join(targetDir, '.claude/iterative-workflow.json');
}

/**
 * Read installed version info
 */
export async function getInstalledVersion(targetDir: string): Promise<VersionInfo | null> {
  const versionFile = getVersionFilePath(targetDir);
  if (await fs.pathExists(versionFile)) {
    try {
      return await fs.readJson(versionFile);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Check if an upgrade is available
 */
export async function checkUpgrade(targetDir: string): Promise<{
  needsUpgrade: boolean;
  currentVersion: string | null;
  availableVersion: string;
}> {
  const installed = await getInstalledVersion(targetDir);
  return {
    needsUpgrade: !installed || installed.version !== FRAMEWORK_VERSION,
    currentVersion: installed?.version ?? null,
    availableVersion: FRAMEWORK_VERSION,
  };
}

/**
 * Copy templates to target project
 */
export async function copyTemplates(targetDir: string, options: CopyOptions = {}): Promise<void> {
  const templatesInfo = getTemplatesDirInfo();
  const templatesDir = templatesInfo.path;

  if (!await fs.pathExists(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  // Create target directories
  await fs.ensureDir(path.join(targetDir, '.claude/agents'));
  await fs.ensureDir(path.join(targetDir, '.claude/commands'));
  await fs.ensureDir(path.join(targetDir, '.claude/skills/iterative-workflow'));

  // Copy agents
  await fs.copy(
    path.join(templatesDir, 'agents'),
    path.join(targetDir, '.claude/agents')
  );

  // Copy commands
  const copiedCommands: string[] = ['iterative-code.md', 'tech-stack.md'];
  await fs.copy(
    path.join(templatesDir, 'commands', 'iterative-code.md'),
    path.join(targetDir, '.claude/commands', 'iterative-code.md')
  );
  await fs.copy(
    path.join(templatesDir, 'commands', 'tech-stack.md'),
    path.join(targetDir, '.claude/commands', 'tech-stack.md')
  );

  if (options.withOpenspec) {
    await fs.copy(
      path.join(templatesDir, 'commands', 'os-apply-iterative.md'),
      path.join(targetDir, '.claude/commands', 'os-apply-iterative.md')
    );
    copiedCommands.push('os-apply-iterative.md');
  }

  // Copy skills
  await fs.copy(
    path.join(templatesDir, 'skills'),
    path.join(targetDir, '.claude/skills')
  );

  // Write version info
  const versionInfo: VersionInfo = {
    version: FRAMEWORK_VERSION,
    installedAt: new Date().toISOString(),
    source: templatesInfo.source,
    components: {
      agents: [
        'code-writer.md',
        'security-reviewer.md',
        'quality-checker.md',
        'performance-analyzer.md',
        'result-aggregator.md',
      ],
      commands: copiedCommands,
      skills: ['iterative-workflow/SKILL.md'],
    },
  };

  await fs.writeJson(getVersionFilePath(targetDir), versionInfo, { spaces: 2 });
}

