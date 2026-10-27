import { existsSync, mkdtempSync, promises as fs, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import execa from 'execa';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { isWatchedPath, listChangedPaths, restoreTestApp } from '../file-reset';

const SCHEMA = 'src/api/article/content-types/article/schema.json';
const SENTINEL = 'src/force-restart-from-playwright-instance.js';
const BASELINE = '{"draftAndPublish":true}';
const MODIFIED = '{"draftAndPublish":false}';

const git = (cwd: string, args: string[]) =>
  execa('git', ['-c', 'user.name=test', '-c', 'user.email=test@test.io', ...args], { cwd });

/**
 * Models how `strapi develop` restarts: a restart forks a worker that reads the watched files at
 * once, answers on /_health only after `bootMs`, and only then starts watching (ignoreInitial),
 * so a change made while it boots is never seen. A watched change on an up worker restarts it
 * `shutdownMs` later.
 */
class FakeDevelop {
  now = 0;

  up = true;

  /** Watched files the serving (or booting) worker read when it started. */
  loaded: string;

  restarts = 0;

  /** False once a Content-Type Builder update failed: the worker then ignores every change. */
  isWatching = true;

  private seen: string | null;

  private bootEndsAt = 0;

  private shutdownAt: number | null = null;

  constructor(
    private appPath: string,
    private bootMs = 3000,
    private shutdownMs = 20
  ) {
    this.loaded = this.read();
    this.seen = this.loaded;
  }

  read() {
    const schema = readFileSync(path.join(this.appPath, SCHEMA), 'utf8');
    const sentinel = existsSync(path.join(this.appPath, SENTINEL));
    return `${schema}|${sentinel}`;
  }

  /** A worker is forked: it reads the files now and comes up after `bootMs`. */
  restartNow() {
    this.up = false;
    this.seen = null;
    this.shutdownAt = null;
    this.restarts += 1;
    this.loaded = this.read();
    this.bootEndsAt = this.now + this.bootMs;
  }

  private tick() {
    if (this.up && this.isWatching && this.shutdownAt === null && this.read() !== this.seen) {
      this.shutdownAt = this.now + this.shutdownMs;
    }
    if (this.shutdownAt !== null && this.now >= this.shutdownAt) {
      this.restartNow();
    }
    if (!this.up && this.now >= this.bootEndsAt) {
      // A fresh worker: watching, and blind to changes made while it booted (ignoreInitial).
      this.up = true;
      this.isWatching = true;
      this.seen = this.read();
    }
  }

  isServerUp = async () => {
    this.tick();
    return this.up;
  };

  sleep = async (ms: number) => {
    this.now += ms;
  };

  clock = () => this.now;
}

let appPath: string;

const write = async (file: string, content: string) => {
  await fs.mkdir(path.dirname(path.join(appPath, file)), { recursive: true });
  await fs.writeFile(path.join(appPath, file), content);
};

const restore = (server: FakeDevelop) =>
  restoreTestApp({
    testAppPath: appPath,
    isServerUp: server.isServerUp,
    sleep: server.sleep,
    now: server.clock,
  });

beforeEach(async () => {
  appPath = mkdtempSync(path.join(os.tmpdir(), 'file-reset-'));
  await git(appPath, ['init', '-q']);
  await write(SCHEMA, BASELINE);
  await git(appPath, ['add', '-A']);
  await git(appPath, ['commit', '-q', '-m', 'e2e test app baseline']);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  rmSync(appPath, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('isWatchedPath', () => {
  test.each([
    ['src/api/article/content-types/article/schema.json', true],
    ['src/components/shared/seo.json', true],
    ['config/plugins.js', true],
    ['types/generated/contentTypes.d.ts', false],
    ['src/extensions/documentation/documentation/1.0.0/full_documentation.json', false],
    ['public/uploads_backup_1793137624441/image.png', false],
    ['.strapi/client/app.js', false],
    ['src/.DS_Store', false],
    ['npm-debug.log', false],
  ])('%s → %s', (filePath, watched) => {
    expect(isWatchedPath(filePath)).toBe(watched);
  });
});

describe('listChangedPaths', () => {
  test('lists modified, untracked (file by file) and renamed paths', async () => {
    await write(SCHEMA, MODIFIED);
    await write('types/generated/contentTypes.d.ts', '');
    await write('src/api/old.js', '');
    await git(appPath, ['add', 'src/api/old.js']);
    await git(appPath, ['commit', '-q', '-m', 'old']);
    await git(appPath, ['mv', 'src/api/old.js', 'src/api/new name.js']);

    const paths = await listChangedPaths(appPath);

    expect(paths.sort()).toEqual(
      ['src/api/new name.js', 'src/api/old.js', SCHEMA, 'types/generated/contentTypes.d.ts'].sort()
    );
  });
});

describe('restoreTestApp', () => {
  test('returns after one health check when nothing changed and Strapi is up', async () => {
    const server = new FakeDevelop(appPath);
    const probe = vi.spyOn(server, 'isServerUp');

    await restore(server);

    expect(probe).toHaveBeenCalledTimes(1);
    expect(server.now).toBe(0);
    expect(server.restarts).toBe(0);
  });

  test('removes unwatched generated files without waiting for a restart', async () => {
    const server = new FakeDevelop(appPath);
    await write('types/generated/contentTypes.d.ts', '');
    await write('src/extensions/documentation/documentation/1.0.0/full_documentation.json', '{}');

    await restore(server);

    expect(await listChangedPaths(appPath)).toEqual([]);
    expect(server.now).toBe(0);
    expect(server.restarts).toBe(0);
  });

  test('waits for the restart a watched change triggers', async () => {
    const server = new FakeDevelop(appPath);
    await write(SCHEMA, MODIFIED);
    server.restartNow(); // the test that changed the schema waited for this restart
    server.now += 3000;
    await server.isServerUp();
    expect(server.loaded).toContain(MODIFIED);

    await restore(server);

    expect(server.up).toBe(true);
    expect(server.loaded).toContain(BASELINE);
    expect(server.restarts).toBe(2); // the test's own restart, then one for the reset
  });

  test('lets a restart in progress finish before resetting, so the reset is not missed', async () => {
    const server = new FakeDevelop(appPath);
    await write(SCHEMA, MODIFIED);
    // A test ended right after a Content-Type Builder save: the new worker already read the
    // modified schema and is still booting, without watching yet.
    server.restartNow();
    server.now += 1000;

    await restore(server);

    expect(server.up).toBe(true);
    expect(server.loaded).toContain(BASELINE);
  });

  test('forces a restart when Strapi stays up without seeing the reset', async () => {
    const server = new FakeDevelop(appPath);
    await write(SCHEMA, MODIFIED);
    server.restartNow();
    server.now += 3000;
    await server.isServerUp();
    // Model a worker that booted, then had its watcher miss the reset.
    const isServerUp = server.isServerUp;
    let resetSeen = false;
    server.isServerUp = async () => {
      if (!resetSeen && server.read().startsWith(BASELINE)) {
        resetSeen = true;
        (server as unknown as { seen: string }).seen = server.read();
      }
      return isServerUp();
    };

    await restore(server);

    expect(server.loaded).toContain(BASELINE);
    expect(await listChangedPaths(appPath)).toEqual([]); // the sentinel is gone
  });

  test('restarts once more when Strapi was already down right after the reset', async () => {
    const server = new FakeDevelop(appPath, 3000, 0); // goes down on the first probe after a change
    await write(SCHEMA, MODIFIED);
    server.restartNow();
    server.now += 3000;
    await server.isServerUp();

    await restore(server);

    expect(server.loaded).toContain(BASELINE);
    expect(server.up).toBe(true);
    expect(server.restarts).toBe(3); // the test's own, the reset's, then the forced one
  });

  test('throws when Strapi ignores file changes, instead of running tests on stale files', async () => {
    const server = new FakeDevelop(appPath);
    await write(SCHEMA, MODIFIED);
    server.restartNow();
    server.now += 3000;
    await server.isServerUp();
    server.isWatching = false;
    const tick = (server as unknown as { tick: () => void }).tick.bind(server);
    (server as unknown as { tick: () => void }).tick = () => {
      tick();
      server.isWatching = false;
    };

    await expect(restore(server)).rejects.toThrow(/did not restart/);
    expect(await listChangedPaths(appPath)).toEqual([]); // the sentinel is removed anyway
  });

  test('throws when Strapi does not come back up', async () => {
    const server = new FakeDevelop(appPath, Number.POSITIVE_INFINITY);
    server.restartNow();

    await expect(restore(server)).rejects.toThrow(/did not answer/);
  });
});
