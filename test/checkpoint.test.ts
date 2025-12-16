import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import {
  saveCheckpoint,
  loadCheckpoint,
  loadLatestCheckpoint,
  listCheckpoints,
  deleteCheckpoint,
  cleanOldCheckpoints,
  createCheckpoint,
  updateCheckpointWithIteration,
  createFileSnapshot,
  hasFilesChanged,
  type IterationCheckpoint,
} from '../src/utils/checkpoint.js';

describe('Checkpoint System', () => {
  const testDir = path.join(process.cwd(), 'test-checkpoint-temp');
  const checkpointDir = path.join(testDir, '.claude/checkpoints');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('createCheckpoint', () => {
    it('should create a new checkpoint', () => {
      const checkpoint = createCheckpoint('trace-123', 'Test requirement', {
        language: 'TypeScript',
      });

      expect(checkpoint.traceId).toBe('trace-123');
      expect(checkpoint.requirement).toBe('Test requirement');
      expect(checkpoint.currentIteration).toBe(0);
      expect(checkpoint.techStack).toEqual({ language: 'TypeScript' });
      expect(checkpoint.iterations).toEqual([]);
    });
  });

  describe('updateCheckpointWithIteration', () => {
    it('should add iteration to checkpoint', () => {
      const checkpoint = createCheckpoint('trace-123', 'Test', {});
      const updated = updateCheckpointWithIteration(checkpoint, {
        iteration: 1,
        scores: { security: 90, quality: 85, performance: 88, overall: 87.5 },
        issueCount: { critical: 0, high: 1, medium: 2, low: 3 },
        recommendation: 'ITERATE',
        timestamp: new Date().toISOString(),
      });

      expect(updated.currentIteration).toBe(1);
      expect(updated.iterations.length).toBe(1);
      expect(updated.lastSuccessfulIteration).toBe(0); // Not PASS
    });

    it('should update lastSuccessfulIteration on PASS', () => {
      const checkpoint = createCheckpoint('trace-123', 'Test', {});
      const updated = updateCheckpointWithIteration(checkpoint, {
        iteration: 1,
        scores: { security: 90, quality: 85, performance: 88, overall: 87.5 },
        issueCount: { critical: 0, high: 0, medium: 0, low: 0 },
        recommendation: 'PASS',
        timestamp: new Date().toISOString(),
      });

      expect(updated.lastSuccessfulIteration).toBe(1);
    });
  });

  describe('saveCheckpoint and loadCheckpoint', () => {
    it('should save and load checkpoint', async () => {
      const checkpoint = createCheckpoint('trace-abc', 'Test requirement', {
        language: 'Python',
      });

      await saveCheckpoint(testDir, checkpoint);

      const loaded = await loadCheckpoint(testDir, 'trace-abc');
      expect(loaded).not.toBeNull();
      expect(loaded?.traceId).toBe('trace-abc');
      expect(loaded?.requirement).toBe('Test requirement');
    });

    it('should return null for non-existent checkpoint', async () => {
      const loaded = await loadCheckpoint(testDir, 'non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('loadLatestCheckpoint', () => {
    it('should return null when no checkpoints exist', async () => {
      const latest = await loadLatestCheckpoint(testDir);
      expect(latest).toBeNull();
    });

    it('should return most recent checkpoint', async () => {
      // Save first checkpoint
      const checkpoint1 = createCheckpoint('trace-1', 'First', {});
      await saveCheckpoint(testDir, checkpoint1);

      // Wait a bit to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));

      // Save second checkpoint
      const checkpoint2 = createCheckpoint('trace-2', 'Second', {});
      await saveCheckpoint(testDir, checkpoint2);

      const latest = await loadLatestCheckpoint(testDir);
      expect(latest?.traceId).toBe('trace-2');
    });
  });

  describe('listCheckpoints', () => {
    it('should return empty array when no checkpoints', async () => {
      const list = await listCheckpoints(testDir);
      expect(list).toEqual([]);
    });

    it('should list all checkpoints', async () => {
      await saveCheckpoint(
        testDir,
        createCheckpoint('trace-1', 'First requirement', {})
      );
      await saveCheckpoint(
        testDir,
        createCheckpoint('trace-2', 'Second requirement', {})
      );

      const list = await listCheckpoints(testDir);
      expect(list.length).toBe(2);
      expect(list.map((c) => c.traceId).sort()).toEqual(['trace-1', 'trace-2']);
    });
  });

  describe('deleteCheckpoint', () => {
    it('should delete existing checkpoint', async () => {
      await saveCheckpoint(testDir, createCheckpoint('trace-del', 'Test', {}));

      const deleted = await deleteCheckpoint(testDir, 'trace-del');
      expect(deleted).toBe(true);

      const loaded = await loadCheckpoint(testDir, 'trace-del');
      expect(loaded).toBeNull();
    });

    it('should return false for non-existent checkpoint', async () => {
      const deleted = await deleteCheckpoint(testDir, 'non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('cleanOldCheckpoints', () => {
    it('should keep only recent checkpoints', async () => {
      // Create 5 checkpoints
      for (let i = 1; i <= 5; i++) {
        await saveCheckpoint(
          testDir,
          createCheckpoint(`trace-${i}`, `Test ${i}`, {})
        );
        await new Promise((r) => setTimeout(r, 10)); // Ensure different timestamps
      }

      // Clean, keeping only 2
      const deleted = await cleanOldCheckpoints(testDir, 2);
      expect(deleted).toBe(3);

      const list = await listCheckpoints(testDir);
      expect(list.length).toBe(2);
    });

    it('should not delete when under limit', async () => {
      await saveCheckpoint(testDir, createCheckpoint('trace-1', 'Test', {}));

      const deleted = await cleanOldCheckpoints(testDir, 5);
      expect(deleted).toBe(0);
    });
  });

  describe('createFileSnapshot', () => {
    it('should create snapshot of existing files', async () => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'test content');

      const snapshot = await createFileSnapshot([testFile]);

      expect(snapshot.length).toBe(1);
      expect(snapshot[0].path).toBe(testFile);
      expect(snapshot[0].hash).toBeTruthy();
      expect(snapshot[0].size).toBeGreaterThan(0);
    });

    it('should handle non-existent files', async () => {
      const snapshot = await createFileSnapshot(['/non/existent/file.ts']);

      expect(snapshot.length).toBe(1);
      expect(snapshot[0].hash).toBe('');
      expect(snapshot[0].size).toBe(0);
    });
  });

  describe('hasFilesChanged', () => {
    it('should detect unchanged files', async () => {
      const testFile = path.join(testDir, 'unchanged.txt');
      await fs.writeFile(testFile, 'original content');

      const snapshot = await createFileSnapshot([testFile]);
      const checkpoint: IterationCheckpoint = {
        ...createCheckpoint('test', 'test', {}),
        codeSnapshot: { files: snapshot },
      };

      const changed = await hasFilesChanged(checkpoint);
      expect(changed).toBe(false);
    });

    it('should detect changed files', async () => {
      const testFile = path.join(testDir, 'changed.txt');
      await fs.writeFile(testFile, 'original content');

      const snapshot = await createFileSnapshot([testFile]);
      const checkpoint: IterationCheckpoint = {
        ...createCheckpoint('test', 'test', {}),
        codeSnapshot: { files: snapshot },
      };

      // Modify the file
      await fs.writeFile(testFile, 'modified content');

      const changed = await hasFilesChanged(checkpoint);
      expect(changed).toBe(true);
    });
  });
});
