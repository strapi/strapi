import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeProjectFiles } from '../write';

let dir: string;

const file = (...segments: string[]) => path.join(dir, ...segments);
const put = (relative: string, text: string) => {
  fs.mkdirSync(path.dirname(file(relative)), { recursive: true });
  fs.writeFileSync(file(relative), text);
};
const leftovers = () =>
  fs
    .readdirSync(dir, { recursive: true })
    .map(String)
    .filter((name) => name.includes('end-users-'));

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-write-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('writeProjectFiles', () => {
  it('writes, creates and deletes files, leaving no temporary behind', async () => {
    put('src/a.json', 'old a');
    put('src/gone.json', 'old gone');

    await writeProjectFiles(dir, [
      { path: 'src/a.json', before: 'old a', after: 'new a' },
      { path: 'src/deep/new.json', before: null, after: 'created' },
      { path: 'src/gone.json', before: 'old gone', after: null },
    ]);

    expect(fs.readFileSync(file('src/a.json'), 'utf8')).toBe('new a');
    expect(fs.readFileSync(file('src/deep/new.json'), 'utf8')).toBe('created');
    expect(fs.existsSync(file('src/gone.json'))).toBe(false);
    expect(leftovers()).toEqual([]);
  });

  it('writes every file or none', async () => {
    put('src/a.json', 'old a');
    put('src/b.json', 'old b');
    put('config/plugins.ts', 'old config');

    const rename = fsp.rename.bind(fsp);
    let calls = 0;

    // Each existing file takes two renames (set aside, swapped in): the third is the second file's
    vi.spyOn(fsp, 'rename').mockImplementation(async (from, to) => {
      calls += 1;

      if (calls === 3) {
        throw new Error('disk full');
      }

      return rename(from, to);
    });

    await expect(
      writeProjectFiles(dir, [
        { path: 'src/a.json', before: 'old a', after: 'new a' },
        { path: 'src/b.json', before: 'old b', after: 'new b' },
        { path: 'config/plugins.ts', before: 'old config', after: 'new config' },
      ])
    ).rejects.toThrow('disk full');

    expect(fs.readFileSync(file('src/a.json'), 'utf8')).toBe('old a');
    expect(fs.readFileSync(file('src/b.json'), 'utf8')).toBe('old b');
    expect(fs.readFileSync(file('config/plugins.ts'), 'utf8')).toBe('old config');
    expect(leftovers()).toEqual([]);
  });

  it('refuses a path outside src and config, before writing anything', async () => {
    put('src/a.json', 'old a');

    for (const bad of ['package.json', '../outside.json', 'src/../package.json', '/etc/x', 'src']) {
      await expect(
        writeProjectFiles(dir, [
          { path: 'src/a.json', before: 'old a', after: 'new a' },
          { path: bad, before: null, after: 'x' },
        ])
      ).rejects.toThrow(/not inside src\/ or config\//);
    }

    expect(fs.readFileSync(file('src/a.json'), 'utf8')).toBe('old a');
    expect(fs.existsSync(file('package.json'))).toBe(false);
    expect(leftovers()).toEqual([]);
  });

  it('refuses a path a symbolic link leads out of src and config', async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'eu-outside-'));

    try {
      fs.mkdirSync(file('src'), { recursive: true });
      fs.symlinkSync(outside, file('src/linked'));

      await expect(
        writeProjectFiles(dir, [{ path: 'src/linked/new/x.json', before: null, after: 'x' }])
      ).rejects.toThrow(/not inside src\/ or config\//);

      expect(fs.readdirSync(outside)).toEqual([]);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });
});
