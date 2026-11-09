import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';

import { HOST, baseEnv, strapiBin } from './config';
import { adminIndexFile, hasAdminBuild } from './build';
import type { App } from './generate';

/**
 * How the server runs. Only `develop` for now; a `prod` mode (`strapi start` on a production
 * build) can be added per Playwright project later.
 */
export type ServerMode = 'develop';

export interface StartServerOptions {
  port: number;
  mode?: ServerMode;
  /** Fail before starting when the admin build is missing. Set it for UI tests. */
  requireAdmin?: boolean;
  env?: NodeJS.ProcessEnv;
  /** Max time to wait for the server to be ready. Default: 120 s. */
  timeout?: number;
}

export interface Server {
  app: App;
  port: number;
  url: string;
  pid: number;
  /** Everything the server printed so far. */
  logs: () => string;
  stop: () => Promise<void>;
}

const MAX_LOG_LENGTH = 200_000;
/** Per request: a server that accepts connections but never answers must not stall startup. */
const PROBE_TIMEOUT = 2_000;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const isPortFree = (port: number) =>
  new Promise<boolean>((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, HOST);
  });

const isHealthy = async (url: string) => {
  try {
    const res = await fetch(`${url}/_health`, { signal: AbortSignal.timeout(PROBE_TIMEOUT) });
    return res.status === 204;
  } catch {
    return false;
  }
};

const hasExited = (child: ChildProcess) => child.exitCode !== null || child.signalCode !== null;

const exited = (child: ChildProcess) =>
  new Promise<void>((resolve) => {
    if (hasExited(child)) {
      resolve();
    } else {
      child.once('exit', () => resolve());
    }
  });

/** Signal the whole process group: `strapi develop` runs a primary and a worker process. */
const signalGroup = (child: ChildProcess, signal: NodeJS.Signals) => {
  if (child.pid === undefined) {
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    // already gone
  }
};

/**
 * Every server process group this runner started and that is still running. The groups are
 * detached, so a Ctrl-C in the terminal doesn't reach them: they are killed when the runner
 * process exits or is interrupted, even if a test or hook timed out before it could stop them.
 */
const liveServers = new Set<ChildProcess>();

const killAllServers = () => {
  for (const child of liveServers) {
    signalGroup(child, 'SIGKILL');
  }
  liveServers.clear();
};

let cleanupInstalled = false;
const installCleanup = () => {
  if (cleanupInstalled) {
    return;
  }
  cleanupInstalled = true;

  process.on('exit', killAllServers);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => {
      killAllServers();
      // Keep the default behaviour (exit) when nobody else handles the signal.
      if (process.listenerCount(signal) === 0) {
        process.kill(process.pid, signal);
      }
    });
  }
};

/** Stop every server this runner started. Use it in a final hook, after a possible timeout. */
export const stopAllServers = async () => {
  await Promise.all(
    [...liveServers].map(async (child) => {
      signalGroup(child, 'SIGINT');
      const timer = setTimeout(() => signalGroup(child, 'SIGKILL'), 10_000);
      await exited(child);
      clearTimeout(timer);
    })
  );
};

/**
 * Start a test app with `strapi develop --no-watch-admin --no-build-admin`.
 *
 * Ready means `/_health` answers 204 while the process is still alive. If the process can't
 * start, exits first, or the timeout passes, it rejects with the cause and the server output.
 */
export const startServer = async (app: App, options: StartServerOptions): Promise<Server> => {
  const { port, mode = 'develop', requireAdmin = false, env, timeout = 120_000 } = options;

  if (process.platform === 'win32') {
    // stop() signals the process group with a negative PID, which Windows doesn't support.
    throw new Error('The /tests-next suites do not run on Windows yet.');
  }
  if (requireAdmin && !hasAdminBuild(app)) {
    // Without a build, `--no-build-admin` still passes the readiness check but /admin is a 404.
    throw new Error(`${adminIndexFile(app)} is missing: run buildAdmin() before startServer().`);
  }
  if (!(await isPortFree(port))) {
    throw new Error(
      `Port ${port} is already in use (another test app, or a stale Strapi process?).`
    );
  }

  installCleanup();

  const args = mode === 'develop' ? ['develop', '--no-watch-admin', '--no-build-admin'] : [];
  // serve.cjs leads the group and kills it when this runner goes away (see the file).
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), strapiBin(), ...args], {
    cwd: app.dir,
    env: { ...process.env, ...baseEnv(), ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    // Own process group, so stop() reaches the develop primary and worker too.
    detached: true,
  });

  let spawnError: Error | undefined;
  child.once('error', (error) => {
    spawnError = error;
  });
  if (child.pid !== undefined) {
    liveServers.add(child);
  }
  child.once('exit', () => liveServers.delete(child));

  // The runner must be able to exit while the server runs (for example after a hook timeout):
  // the exit handler above, or serve.cjs on disconnect, kills the group then.
  child.unref();
  child.channel?.unref();

  let output = '';
  const append = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-MAX_LOG_LENGTH);
  };
  for (const stream of [child.stdout, child.stderr]) {
    stream!.on('data', append);
    (stream as unknown as net.Socket).unref();
  }

  const url = `http://${HOST}:${port}`;

  const stop = async () => {
    if (child.pid === undefined || hasExited(child)) {
      return;
    }
    signalGroup(child, 'SIGINT');
    const timer = setTimeout(() => signalGroup(child, 'SIGKILL'), 10_000);
    await exited(child);
    clearTimeout(timer);

    // The worker can outlive the primary for a moment: wait for the port.
    for (let i = 0; i < 100 && !(await isPortFree(port)); i += 1) {
      await sleep(50);
    }
  };

  const start = Date.now();

  while (!(await isHealthy(url))) {
    if (spawnError) {
      throw new Error(`Could not start Strapi (${app.name}): ${spawnError.message}`, {
        cause: spawnError,
      });
    }
    if (hasExited(child)) {
      throw new Error(`Strapi (${app.name}) exited before it was ready:\n${output.slice(-4000)}`);
    }
    if (Date.now() - start > timeout) {
      await stop();
      throw new Error(
        `Strapi (${app.name}) was not ready after ${timeout} ms:\n${output.slice(-4000)}`
      );
    }
    await sleep(50);
  }

  return { app, port, url, pid: child.pid!, logs: () => output, stop };
};

export const stopServer = (server: Server) => server.stop();
