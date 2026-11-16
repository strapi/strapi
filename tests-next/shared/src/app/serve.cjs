/**
 * Group leader of a test server, started by `startServer()` with an IPC channel:
 *
 *   node serve.cjs <strapi bin> <args...>
 *
 * It runs the Strapi CLI as a child in its own process group, and kills the whole group as soon
 * as the test runner that started it goes away. The OS closes the IPC channel even when the
 * runner is killed with SIGKILL (Ctrl-C through yarn and nx, a CI cancel), where no exit handler
 * of the runner runs.
 */

const { spawn } = require('node:child_process');

const [bin, ...args] = process.argv.slice(2);

const child = spawn(process.execPath, [bin, ...args], { stdio: 'inherit' });

const killGroup = () => {
  try {
    process.kill(-process.pid, 'SIGKILL');
  } catch {
    // already gone
  }
};

process.on('disconnect', killGroup);

// stop() signals the whole group: Strapi shuts down on it, and this process exits with it.
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {});
}

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
