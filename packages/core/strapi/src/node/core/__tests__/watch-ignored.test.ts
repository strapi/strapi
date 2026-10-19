import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import chokidar from 'chokidar';

import { createAppRelativeIgnore } from '../watch-ignored';

const getWatchedFiles = async (appDir: string) => {
  const watcher = chokidar.watch(appDir, {
    ignoreInitial: true,
    ignored: createAppRelativeIgnore(appDir),
  });

  await new Promise<void>((resolve) => {
    watcher.on('ready', () => resolve());
  });

  const watched = watcher.getWatched();
  await watcher.close();

  return Object.entries(watched).flatMap(([dir, entries]) =>
    entries.map((entry) => path.relative(appDir, path.join(dir, entry)))
  );
};

describe('createAppRelativeIgnore', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-watch-'));
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const createApp = (appDir: string) => {
    fs.mkdirSync(path.join(appDir, 'src', 'api'), { recursive: true });
    fs.mkdirSync(path.join(appDir, '.tmp'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'tmp'), { recursive: true });
    fs.writeFileSync(path.join(appDir, 'src', 'index.js'), '');
    fs.writeFileSync(path.join(appDir, '.env'), '');
    fs.writeFileSync(path.join(appDir, '.tmp', 'data.db'), '');
    fs.writeFileSync(path.join(appDir, 'tmp', 'file.js'), '');
  };

  test('watches app files when the app is under a dot directory', async () => {
    const appDir = path.join(rootDir, '.config', 'my-app');
    createApp(appDir);

    const files = await getWatchedFiles(appDir);

    expect(files).toContain(path.join('src', 'index.js'));
  });

  test('watches app files when the app path contains "tmp"', async () => {
    const appDir = path.join(rootDir, 'tmp', 'my-app');
    createApp(appDir);

    const files = await getWatchedFiles(appDir);

    expect(files).toContain(path.join('src', 'index.js'));
  });

  test('ignores dot files, dot directories and "tmp" paths inside the app', async () => {
    const appDir = path.join(rootDir, 'my-app');
    createApp(appDir);

    const files = await getWatchedFiles(appDir);

    expect(files).toContain(path.join('src', 'index.js'));
    expect(files).not.toContain('.env');
    expect(files).not.toContain('.tmp');
    expect(files).not.toContain(path.join('.tmp', 'data.db'));
    expect(files).not.toContain('tmp');
    expect(files).not.toContain(path.join('tmp', 'file.js'));
  });
});
