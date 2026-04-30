import execa from 'execa';

import { delay, pollHealthCheck } from './restart';

const gitUser = ['-c', 'user.name=Strapi CLI', '-c', 'user.email=test@strapi.io'];

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

  // wait for the server to restart after modifying files
  console.log('Waiting for Strapi to restart...');

  // TODO:  This is both a waste of time and flaky.
  //        We need to find a way to access the playwright server output and watch for the "up" log to appear
  await delay(5); // give Strapi time to detect file changes and begin restart
  await pollHealthCheck(); // give it time to come back up
};
