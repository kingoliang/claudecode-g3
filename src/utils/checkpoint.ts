/**
 * Checkpoint system for state persistence and recovery
 * Enables resumption of iterative workflows across sessions
 */
import fs from 'fs-extra';
import path from 'path';
import { createHash } from 'crypto';
import { logger } from '../observability/logger.js';

export interface FileSnapshot {
  path: string;
  hash: string;
  size: number;
}

export interface IterationSnapshot {
  iteration: number;
  scores: {
    security: number;
    quality: number;
    performance: number;
    overall: number;
  };
  issueCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recommendation: string;
  timestamp: string;
}

export interface IterationCheckpoint {
  traceId: string;
  requirement: string;
  currentIteration: number;
  lastSuccessfulIteration: number;
  techStack: Record<string, unknown>;
  codeSnapshot: {
    files: FileSnapshot[];
  };
  iterations: IterationSnapshot[];
  createdAt: string;
  updatedAt: string;
}

const CHECKPOINT_DIR = '.claude/checkpoints';

/**
 * Calculate file hash for comparison
 */
async function calculateFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath);
    return createHash('md5').update(content).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Create a snapshot of files
 */
export async function createFileSnapshot(
  files: string[]
): Promise<FileSnapshot[]> {
  const snapshots: FileSnapshot[] = [];

  for (const filePath of files) {
    try {
      const stats = await fs.stat(filePath);
      const hash = await calculateFileHash(filePath);
      snapshots.push({
        path: filePath,
        hash,
        size: stats.size,
      });
    } catch {
      // File might not exist yet
      snapshots.push({
        path: filePath,
        hash: '',
        size: 0,
      });
    }
  }

  return snapshots;
}

/**
 * Save checkpoint to disk
 */
export async function saveCheckpoint(
  targetDir: string,
  checkpoint: IterationCheckpoint
): Promise<string> {
  const checkpointDir = path.join(targetDir, CHECKPOINT_DIR);
  await fs.ensureDir(checkpointDir);

  const filename = `${checkpoint.traceId}.json`;
  const filepath = path.join(checkpointDir, filename);

  checkpoint.updatedAt = new Date().toISOString();

  await fs.writeJson(filepath, checkpoint, { spaces: 2 });
  logger.checkpointSaved(checkpoint.traceId, checkpoint.currentIteration);

  return filepath;
}

/**
 * Load checkpoint by trace ID
 */
export async function loadCheckpoint(
  targetDir: string,
  traceId: string
): Promise<IterationCheckpoint | null> {
  const filepath = path.join(targetDir, CHECKPOINT_DIR, `${traceId}.json`);

  if (!(await fs.pathExists(filepath))) {
    return null;
  }

  try {
    return await fs.readJson(filepath);
  } catch {
    return null;
  }
}

/**
 * Load the most recent checkpoint
 */
export async function loadLatestCheckpoint(
  targetDir: string
): Promise<IterationCheckpoint | null> {
  const checkpointDir = path.join(targetDir, CHECKPOINT_DIR);

  if (!(await fs.pathExists(checkpointDir))) {
    return null;
  }

  const files = await fs.readdir(checkpointDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    return null;
  }

  // Sort by modification time, get latest
  const stats = await Promise.all(
    jsonFiles.map(async (f) => ({
      file: f,
      mtime: (await fs.stat(path.join(checkpointDir, f))).mtime.getTime(),
    }))
  );

  stats.sort((a, b) => b.mtime - a.mtime);
  const latestFile = stats[0].file;

  try {
    return await fs.readJson(path.join(checkpointDir, latestFile));
  } catch {
    return null;
  }
}

/**
 * List all checkpoints
 */
export async function listCheckpoints(
  targetDir: string
): Promise<
  Array<{
    traceId: string;
    requirement: string;
    iteration: number;
    updatedAt: string;
  }>
> {
  const checkpointDir = path.join(targetDir, CHECKPOINT_DIR);

  if (!(await fs.pathExists(checkpointDir))) {
    return [];
  }

  const files = await fs.readdir(checkpointDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  const checkpoints = await Promise.all(
    jsonFiles.map(async (f) => {
      try {
        const data = await fs.readJson(path.join(checkpointDir, f));
        return {
          traceId: data.traceId,
          requirement: data.requirement?.slice(0, 100) ?? '',
          iteration: data.currentIteration,
          updatedAt: data.updatedAt,
        };
      } catch {
        return null;
      }
    })
  );

  return checkpoints.filter((c): c is NonNullable<typeof c> => c !== null);
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(
  targetDir: string,
  traceId: string
): Promise<boolean> {
  const filepath = path.join(targetDir, CHECKPOINT_DIR, `${traceId}.json`);

  if (!(await fs.pathExists(filepath))) {
    return false;
  }

  await fs.remove(filepath);
  return true;
}

/**
 * Clean old checkpoints, keep only the most recent N
 */
export async function cleanOldCheckpoints(
  targetDir: string,
  keepCount: number = 5
): Promise<number> {
  const checkpointDir = path.join(targetDir, CHECKPOINT_DIR);

  if (!(await fs.pathExists(checkpointDir))) {
    return 0;
  }

  const files = await fs.readdir(checkpointDir);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length <= keepCount) {
    return 0;
  }

  const stats = await Promise.all(
    jsonFiles.map(async (f) => ({
      file: f,
      mtime: (await fs.stat(path.join(checkpointDir, f))).mtime.getTime(),
    }))
  );

  stats.sort((a, b) => b.mtime - a.mtime);

  const toDelete = stats.slice(keepCount);
  for (const { file } of toDelete) {
    await fs.remove(path.join(checkpointDir, file));
  }

  return toDelete.length;
}

/**
 * Create a new checkpoint from scratch
 */
export function createCheckpoint(
  traceId: string,
  requirement: string,
  techStack: Record<string, unknown>
): IterationCheckpoint {
  const now = new Date().toISOString();
  return {
    traceId,
    requirement,
    currentIteration: 0,
    lastSuccessfulIteration: 0,
    techStack,
    codeSnapshot: {
      files: [],
    },
    iterations: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update checkpoint with iteration result
 */
export function updateCheckpointWithIteration(
  checkpoint: IterationCheckpoint,
  iteration: IterationSnapshot
): IterationCheckpoint {
  return {
    ...checkpoint,
    currentIteration: iteration.iteration,
    lastSuccessfulIteration:
      iteration.recommendation === 'PASS'
        ? iteration.iteration
        : checkpoint.lastSuccessfulIteration,
    iterations: [...checkpoint.iterations, iteration],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if files have changed since checkpoint
 */
export async function hasFilesChanged(
  checkpoint: IterationCheckpoint
): Promise<boolean> {
  for (const file of checkpoint.codeSnapshot.files) {
    const currentHash = await calculateFileHash(file.path);
    if (currentHash !== file.hash) {
      return true;
    }
  }
  return false;
}
