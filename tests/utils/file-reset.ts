import execa from 'execa';

import { delay, isServerHealthy, pollHealthCheck } from './restart';

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

/**
 * Paths the `strapi develop` file watcher ignores (`startWatcher` in
 * packages/core/strapi/src/node/develop.ts), relative to the test app root. Restoring only these
 * never restarts the server. Among them are files Strapi writes itself after the baseline commit:
 * `types/` and the documentation plugin's spec on every start, `public/uploads_backup_*` folders
 * left by a fixture restore. Kept no broader than the watcher's list, so a restored path that
 * matches none of these is treated as one that restarts the server.
 */
const IGNORED_BY_WATCHER = [
  /(^|\/)\./, // dot files and folders
  /tmp/,
  /^src\/admin\//,
  /^src\/plugins\/.*\/admin\//,
  /(^|\/)documentation(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)plugins\.json$/,
  /(^|\/)(build|log|logs|public)(\/|$)/,
  /(^|\/)(dist|exports)\//,
  /\.log$/,
  /(^|\/)index\.html$/,
  /\.db[^/]*$/,
  /\.d\.ts$/,
  /(^|\/)yalc\.lock$/,
];

export const restartsServer = (filePath: string) =>
  !IGNORED_BY_WATCHER.some((pattern) => pattern.test(filePath));

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

  // Nothing changed since the baseline, so there is nothing to restore and no restart to wait for.
  // `git status` lists exactly what `reset --hard` and `clean -fd` below would touch, one file per
  // line, so each can be checked against the watcher's ignore list.
  const { stdout: changes } = await execa(
    'git',
    ['status', '--porcelain', '--untracked-files=all'],
    {
      cwd: testAppPath,
    }
  );
  const changedPaths = changes
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => line.slice(3).split(' -> '));
  if (changedPaths.length === 0) {
    return;
  }

  console.log('Restoring filesystem');
  // HEAD is the single baseline commit created during e2e app setup (`commitE2eBaseline` in shared-setup).
  // Tracked files → match that commit; untracked (non-ignored) files/dirs → removed.
  await execa('git', [...gitUser, 'reset', '--hard'], {
    stdio: 'inherit',
    cwd: testAppPath,
  });

  await execa('git', [...gitUser, 'clean', '-fd'], {
    stdio: 'inherit',
    cwd: testAppPath,
  });

  // `.tmp/` (SQLite) is gitignored — it is not removed by `clean -fd` and still holds rows from past CTs.
  // Deleting it while Strapi is running can crash the server. DTS import re-seeds allowed UIDs but
  // does not remove arbitrary API types from the DB.

  // Only unwatched files changed (the files Strapi writes on every start, at the first reset of
  // every domain): no restart is coming, and waiting for one cost the whole 5 s
  // `waitForServerDown` window.
  if (!changedPaths.some(restartsServer)) {
    return;
  }

  // wait for the server to restart after modifying files
  console.log('Waiting for Strapi to restart...');

  // The file watcher restarts the server: wait until it goes down (it can't serve the old
  // files anymore), then until it is back up. If it never goes down within the window, the
  // restored files weren't watched and the server is already serving the baseline.
  await waitForServerDown();
  await pollHealthCheck(250);
};

const waitForServerDown = async (timeoutMs = 5000, intervalMs = 100) => {
  const url = `http://127.0.0.1:${process.env.PORT?.trim()}/_health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    // Bounded probe: one that lands on the worker being replaced can otherwise hang for 300 s.
    if (!(await isServerHealthy(url))) {
      return;
    }
    await delay(intervalMs / 1000);
  }
};
