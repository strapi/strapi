'use strict';

const treeKill = require('tree-kill');

/**
 * Stop a background `npm run start` Strapi child and its subprocess tree.
 *
 * Remote transfer CLI tests previously used `child.killed` after SIGTERM to decide
 * whether to SIGKILL. Node sets `killed` as soon as kill() is called, not when the
 * process exits — so SIGKILL never ran and SQLite on test-app-0 could stay locked
 * when later suites (e.g. admin:block-user) reset the shared app on slow CI.
 */
async function stopRemoteStrapiProcess(child, { graceMs = 5000 } = {}) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const killTree = (signal) =>
    new Promise((resolve) => {
      treeKill(child.pid, signal, () => resolve());
    });

  await killTree('SIGTERM');

  const exitedAfterTerm = await Promise.race([
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve(true);
        return;
      }
      child.once('exit', () => resolve(true));
    }),
    new Promise((resolve) => setTimeout(() => resolve(false), graceMs)),
  ]);

  if (exitedAfterTerm || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await killTree('SIGKILL');

  await Promise.race([
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }
      child.once('exit', resolve);
    }),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
}

module.exports = {
  stopRemoteStrapiProcess,
};
