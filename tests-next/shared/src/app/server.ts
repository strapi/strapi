import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

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
    const res = await fetch(`${url}/_health`);
    return res.status === 204;
  } catch {
    return false;
  }
};

const exited = (child: ChildProcess) =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
    } else {
      child.once('exit', () => resolve());
    }
  });

/** Signal the whole process group: `strapi develop` runs a primary and a worker process. */
const signalGroup = (child: ChildProcess, signal: NodeJS.Signals) => {
  try {
    process.kill(-child.pid!, signal);
  } catch {
    // already gone
  }
};

/**
 * Start a test app with `strapi develop --no-watch-admin --no-build-admin`.
 *
 * Ready means `/_health` answers 204 while the process is still alive. If the process exits
 * first, or the timeout passes, it rejects with the server output.
 */
export const startServer = async (app: App, options: StartServerOptions): Promise<Server> => {
  const { port, mode = 'develop', requireAdmin = false, env, timeout = 120_000 } = options;

  if (requireAdmin && !hasAdminBuild(app)) {
    // Without a build, `--no-build-admin` still passes the readiness check but /admin is a 404.
    throw new Error(`${adminIndexFile(app)} is missing: run buildAdmin() before startServer().`);
  }
  if (!(await isPortFree(port))) {
    throw new Error(
      `Port ${port} is already in use (another test app, or a stale Strapi process?).`
    );
  }

  const args = mode === 'develop' ? ['develop', '--no-watch-admin', '--no-build-admin'] : [];
  const child = spawn(process.execPath, [strapiBin(), ...args], {
    cwd: app.dir,
    env: { ...process.env, ...baseEnv(), ...env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    // Own process group, so stop() reaches the develop worker too.
    detached: true,
  });

  let output = '';
  const append = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-MAX_LOG_LENGTH);
  };
  child.stdout!.on('data', append);
  child.stderr!.on('data', append);

  const url = `http://${HOST}:${port}`;

  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) {
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
  let processExited = false;
  child.once('exit', () => {
    processExited = true;
  });

  while (!(await isHealthy(url))) {
    if (processExited) {
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
