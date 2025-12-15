import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import semver from 'semver';
import { discoverAgents, type DiscoveryResult } from './agent-discovery.js';
import { discoverCommands, filterCommands, type CommandDiscoveryResult } from './command-discovery.js';
import { discoverSkills, type SkillDiscoveryResult } from './skill-discovery.js';
import { FRAMEWORK_VERSION } from './version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Re-export FRAMEWORK_VERSION for backwards compatibility
export { FRAMEWORK_VERSION };

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
 * Get potential global npm paths based on platform
 */
function getGlobalNpmPaths(): string[] {
  const paths: string[] = [];
  const home = process.env.HOME || process.env.USERPROFILE || '';

  if (process.platform === 'win32') {
    // Windows paths
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    paths.push(path.join(appData, 'npm', 'node_modules', 'iterative-workflow', 'templates'));
    paths.push(path.join(home, 'AppData', 'Local', 'npm-cache', '_npx', '**', 'node_modules', 'iterative-workflow', 'templates'));
    // npm prefix on Windows
    paths.push(path.join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node_modules', 'iterative-workflow', 'templates'));
  } else {
    // Unix-like paths (macOS, Linux)
    paths.push('/usr/local/lib/node_modules/iterative-workflow/templates');
    paths.push('/usr/lib/node_modules/iterative-workflow/templates');
    paths.push(path.join(home, '.npm-global', 'lib', 'node_modules', 'iterative-workflow', 'templates'));
    paths.push(path.join(home, '.nvm', 'versions', 'node', '**', 'lib', 'node_modules', 'iterative-workflow', 'templates'));
    // Homebrew on macOS
    paths.push('/opt/homebrew/lib/node_modules/iterative-workflow/templates');
  }

  // NVM_DIR if set
  if (process.env.NVM_DIR) {
    paths.push(path.join(process.env.NVM_DIR, 'versions', 'node', '**', 'lib', 'node_modules', 'iterative-workflow', 'templates'));
  }

  return paths;
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
    { path: path.join(process.cwd(), 'node_modules', 'iterative-workflow', 'templates'), source: 'node_modules' },
    // Global npm installation (platform-specific)
    ...getGlobalNpmPaths().map(p => ({ path: p, source: 'global' as const })),
  ];

  for (const candidate of candidates) {
    // Skip glob patterns (containing **) - just check exact paths
    if (!candidate.path.includes('**') && fs.existsSync(candidate.path)) {
      return candidate;
    }
  }

  // Build helpful error message
  const triedPaths = candidates
    .filter(c => !c.path.includes('**'))
    .map(c => `  - ${c.path} (${c.source})`)
    .join('\n');
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
 * Combined discovery result for all templates
 */
export interface TemplateDiscoveryResult {
  agents: DiscoveryResult;
  commands: CommandDiscoveryResult;
  skills: SkillDiscoveryResult;
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
 * Upgrade status with detailed comparison
 */
export type UpgradeStatus = 'needs_upgrade' | 'up_to_date' | 'newer_installed' | 'not_installed';

/**
 * Check if an upgrade is available using semantic versioning
 */
export async function checkUpgrade(targetDir: string): Promise<{
  needsUpgrade: boolean;
  status: UpgradeStatus;
  currentVersion: string | null;
  availableVersion: string;
}> {
  const installed = await getInstalledVersion(targetDir);

  if (!installed) {
    return {
      needsUpgrade: true,
      status: 'not_installed',
      currentVersion: null,
      availableVersion: FRAMEWORK_VERSION,
    };
  }

  const current = semver.valid(semver.coerce(installed.version));
  const available = semver.valid(semver.coerce(FRAMEWORK_VERSION));

  if (!current || !available) {
    // Fallback to string comparison if versions are invalid
    return {
      needsUpgrade: installed.version !== FRAMEWORK_VERSION,
      status: installed.version !== FRAMEWORK_VERSION ? 'needs_upgrade' : 'up_to_date',
      currentVersion: installed.version,
      availableVersion: FRAMEWORK_VERSION,
    };
  }

  const comparison = semver.compare(current, available);

  return {
    needsUpgrade: comparison < 0,
    status: comparison < 0 ? 'needs_upgrade' : comparison > 0 ? 'newer_installed' : 'up_to_date',
    currentVersion: installed.version,
    availableVersion: FRAMEWORK_VERSION,
  };
}

/**
 * Copy templates to target project
 * @returns Combined discovery result with information about copied agents, commands, and skills
 */
export async function copyTemplates(targetDir: string, options: CopyOptions = {}): Promise<TemplateDiscoveryResult> {
  const templatesInfo = getTemplatesDirInfo();
  const templatesDir = templatesInfo.path;

  if (!await fs.pathExists(templatesDir)) {
    throw new Error(`Templates directory not found: ${templatesDir}`);
  }

  // Create target directories
  await fs.ensureDir(path.join(targetDir, '.claude/agents'));
  await fs.ensureDir(path.join(targetDir, '.claude/commands'));
  await fs.ensureDir(path.join(targetDir, '.claude/skills'));

  // Copy agents
  await fs.copy(
    path.join(templatesDir, 'agents'),
    path.join(targetDir, '.claude/agents')
  );

  // Discover and copy commands dynamically
  const commandsDir = path.join(templatesDir, 'commands');
  const commandDiscovery = await discoverCommands(commandsDir);
  const commandsToCopy = filterCommands(commandDiscovery.commands, options);

  for (const cmd of commandsToCopy) {
    await fs.copy(
      path.join(commandsDir, cmd.fileName),
      path.join(targetDir, '.claude/commands', cmd.fileName)
    );
  }

  // Copy and discover skills dynamically
  const skillsDir = path.join(templatesDir, 'skills');
  await fs.copy(skillsDir, path.join(targetDir, '.claude/skills'));
  const skillDiscovery = await discoverSkills(skillsDir);

  // Discover agents from templates directory
  const agentsDir = path.join(templatesDir, 'agents');
  const agentDiscovery = await discoverAgents(agentsDir);

  // Write version info with discovered components
  const versionInfo: VersionInfo = {
    version: FRAMEWORK_VERSION,
    installedAt: new Date().toISOString(),
    source: templatesInfo.source,
    components: {
      agents: agentDiscovery.agents.map(a => a.fileName),
      commands: commandsToCopy.map(c => c.fileName),
      skills: skillDiscovery.skills.map(s => s.filePath),
    },
  };

  await fs.writeJson(getVersionFilePath(targetDir), versionInfo, { spaces: 2 });

  return {
    agents: agentDiscovery,
    skills: skillDiscovery,
    commands: {
      commands: commandsToCopy,
      errors: commandDiscovery.errors,
    },
  };
}

