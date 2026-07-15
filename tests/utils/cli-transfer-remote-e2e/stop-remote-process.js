'use strict';

/**
 * Stop a background `npm run start` Strapi process group.
 *
 * The test starts npm in its own process group so SIGTERM reaches both npm and
 * the Strapi child. The fallback SIGKILL only runs if the process group does not
 * exit in time, avoiding SQLite locks in later suites that reuse the same app.
 */
async function stopRemoteStrapiProcess(child, { graceMs = 5000 } = {}) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const signalProcess = (signal) => {
    if (process.platform === 'win32') {
      return child.kill(signal);
    }

    try {
      process.kill(-child.pid, signal);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') {
        return false;
      }
      throw error;
    }
  };

  signalProcess('SIGTERM');

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

  signalProcess('SIGKILL');

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
