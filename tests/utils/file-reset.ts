import { promises as fs } from 'node:fs';
import path from 'node:path';

import execa from 'execa';

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

/**
 * Creating this file makes `strapi develop` restart: it sits in a watched folder and the app
 * never loads it. `restart()` in ./restart.ts uses the same file.
 */
const RESTART_SENTINEL = 'src/force-restart-from-playwright-instance.js';

/**
 * Folders and suffixes from the `ignored` list of the `strapi develop` watcher
 * (`startWatcher` in packages/core/strapi/src/node/develop.ts). The dev server writes some of them
 * itself on every boot (`types/`, the documentation plugin's spec, upload backups under
 * `public/`), so they are dirty at the start of every domain. Changing them never restarts the
 * server. Any other path is treated as watched.
 */
const UNWATCHED_FOLDERS = new Set([
  'build',
  'dist',
  'documentation',
  'exports',
  'log',
  'logs',
  'node_modules',
  'public',
]);
const UNWATCHED_SUFFIXES = ['.d.ts', '.log'];

export const isWatchedPath = (filePath: string) => {
  const segments = filePath.split('/');
  // The last segment is the file name: only folders count for UNWATCHED_FOLDERS.
  const folders = segments.slice(0, -1);
  const fileName = segments[segments.length - 1];

  if (segments.some((segment) => segment.startsWith('.'))) {
    return false;
  }
  if (folders.some((folder) => UNWATCHED_FOLDERS.has(folder))) {
    return false;
  }
  return !UNWATCHED_SUFFIXES.some((suffix) => fileName.endsWith(suffix));
};

/**
 * The paths `git reset --hard` and `git clean -fd` would touch, one per file
 * (untracked folders are listed file by file).
 */
export const listChangedPaths = async (cwd: string) => {
  const { stdout } = await execa('git', ['status', '--porcelain', '-z', '--untracked-files=all'], {
    cwd,
  });
  const entries = stdout.split('\0').filter(Boolean);
  const paths: string[] = [];

  for (let i = 0; i < entries.length; i += 1) {
    const status = entries[i].slice(0, 2);
    paths.push(entries[i].slice(3));

    // With -z, a rename or copy is followed by its source path as a separate entry.
    if (status[0] === 'R' || status[0] === 'C') {
      i += 1;
      paths.push(entries[i]);
    }
  }

  return paths;
};

export interface RestoreTestAppOptions {
  testAppPath: string;
  isServerUp: () => Promise<boolean>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** How long a restart may take to begin once a watched file changed. */
  restartStartTimeoutMs?: number;
  /** How long the server may take to answer again. */
  serverUpTimeoutMs?: number;
  pollIntervalMs?: number;
}

/**
 * Restore the test app's files to the e2e baseline commit and return only once the running
 * server has loaded them.
 *
 * `strapi develop` restarts by forking a new worker. That worker reads the app files while it
 * boots and starts watching them only once it has booted, just before it listens. A change made
 * in between is never seen: the server comes back up with the files it read before the change.
 * So a reset counts only if the server restarted after it, which this function makes sure of.
 */
export const restoreTestApp = async ({
  testAppPath,
  isServerUp,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = Date.now,
  restartStartTimeoutMs = 5000,
  serverUpTimeoutMs = 60000,
  pollIntervalMs = 100,
}: RestoreTestAppOptions) => {
  const waitFor = async (up: boolean, timeoutMs: number) => {
    const deadline = now() + timeoutMs;

    while ((await isServerUp()) !== up) {
      if (now() >= deadline) {
        return false;
      }
      await sleep(pollIntervalMs);
    }

    return true;
  };

  const waitForUp = async () => {
    if (!(await waitFor(true, serverUpTimeoutMs))) {
      throw new Error(`resetFiles: Strapi did not answer within ${serverUpTimeoutMs} ms`);
    }
  };

  const forceRestart = async () => {
    const sentinel = path.join(testAppPath, RESTART_SENTINEL);

    console.log('Forcing a restart so Strapi loads the restored files...');
    await fs.writeFile(sentinel, '');

    try {
      if (!(await waitFor(false, restartStartTimeoutMs))) {
        throw new Error(
          `resetFiles: Strapi did not restart within ${restartStartTimeoutMs} ms of a change to ${RESTART_SENTINEL}, so it may still run with the files from before the reset`
        );
      }
    } finally {
      // The old worker stopped watching before it went down, and the new one starts watching
      // only once it has booted, so this deletion triggers nothing.
      await fs.rm(sentinel, { force: true });
    }

    await waitForUp();
  };

  // While the server is down a restart is under way, and the worker it starts may be booting
  // without watching yet. Let it finish, so a reset below is seen by a watching worker.
  await waitForUp();

  const changedPaths = await listChangedPaths(testAppPath);
  if (changedPaths.length === 0) {
    return;
  }

  console.log('Restoring filesystem');
  // HEAD is the single baseline commit created during e2e app setup (`commitE2eBaseline` in shared-setup).
  // Tracked files → match that commit; untracked (non-ignored) files/dirs → removed.
  await execa('git', [...gitUser, 'reset', '--hard'], { stdio: 'inherit', cwd: testAppPath });
  await execa('git', [...gitUser, 'clean', '-fd'], { stdio: 'inherit', cwd: testAppPath });

  // `.tmp/` (SQLite) is gitignored — it is not removed by `clean -fd` and still holds rows from past CTs.
  // Deleting it while Strapi is running can crash the server. DTS import re-seeds allowed UIDs but
  // does not remove arbitrary API types from the DB.

  if (!changedPaths.some(isWatchedPath)) {
    // Only files the server writes itself and never watches: nothing to reload.
    return;
  }

  console.log('Waiting for Strapi to restart...');

  if (await isServerUp()) {
    // Up after the reset, so the restart that takes it down begins after the reset too, and the
    // worker it starts reads the restored files.
    if (await waitFor(false, restartStartTimeoutMs)) {
      await waitForUp();
      return;
    }
    // Still up: this worker was booting when the files changed and never saw the change.
  } else {
    // Already down: this restart may have begun, and read the files, before the reset.
    await waitForUp();
  }

  await forceRestart();
};

export const resetFiles = async () => {
  const testAppPath = process.env.TEST_APP_PATH;
  if (!testAppPath) {
    const msg =
      'TEST_APP_PATH is not set; cannot reset the test app. Use `yarn test:e2e` so the runner passes the generated app path.';
    if (process.env.CI) {
      throw new Error(msg);
    }
    console.warn(msg);
    return;
  }

  const port = process.env.PORT?.trim();
  if (!port) {
    throw new Error(
      'resetFiles: PORT is not set. Run e2e via `yarn test:e2e` so the browser runner sets PORT (and TEST_APP_PATH) for this process.'
    );
  }
  const healthUrl = `http://127.0.0.1:${port}/_health`;

  await restoreTestApp({
    testAppPath,
    isServerUp: async () => {
      try {
        const response = await fetch(healthUrl, { method: 'HEAD' });
        return response.ok;
      } catch {
        return false;
      }
    },
  });
};
