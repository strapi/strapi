import path from 'path';
import os from 'os';

import fse from 'fs-extra';

import { discoverMigrationFiles } from '../discover';

describe('discoverMigrationFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-migrations-'));
  });

  afterEach(async () => {
    await fse.remove(tempDir);
  });

  it('returns js and sql files sorted alphabetically with absolute paths', async () => {
    await fse.writeFile(path.join(tempDir, '002-b.sql'), 'SELECT 1;');
    await fse.writeFile(path.join(tempDir, '001-a.js'), 'module.exports = {}');
    await fse.writeFile(path.join(tempDir, 'README.md'), '# ignore');
    await fse.writeFile(path.join(tempDir, '003-c.ts'), '// ignore');

    const files = discoverMigrationFiles(tempDir);

    expect(files).toEqual([path.resolve(tempDir, '001-a.js'), path.resolve(tempDir, '002-b.sql')]);
  });

  it('returns an empty array when the directory does not exist', () => {
    expect(discoverMigrationFiles(path.join(tempDir, 'missing'))).toEqual([]);
  });

  it('returns an empty array for an empty directory', () => {
    expect(discoverMigrationFiles(tempDir)).toEqual([]);
  });

  it('does not recurse into nested directories', async () => {
    await fse.writeFile(path.join(tempDir, '001-real.js'), 'module.exports = {}');
    await fse.ensureDir(path.join(tempDir, 'nested'));
    await fse.writeFile(path.join(tempDir, 'nested', 'ignored.js'), 'module.exports = {}');

    expect(discoverMigrationFiles(tempDir)).toEqual([path.resolve(tempDir, '001-real.js')]);
  });

  it('ignores dot-prefixed migration filenames (fast-glob dot: false parity)', async () => {
    await fse.writeFile(path.join(tempDir, '001-real.js'), 'module.exports = {}');
    await fse.writeFile(path.join(tempDir, '.hidden.js'), 'module.exports = {}');
    await fse.writeFile(path.join(tempDir, '.hidden.sql'), 'SELECT 1;');

    expect(discoverMigrationFiles(tempDir)).toEqual([path.resolve(tempDir, '001-real.js')]);
  });

  it('ignores directories whose names end in .js or .sql (fast-glob onlyFiles parity)', async () => {
    await fse.writeFile(path.join(tempDir, '001-real.js'), 'module.exports = {}');
    await fse.ensureDir(path.join(tempDir, 'not-a-file.js'));
    await fse.ensureDir(path.join(tempDir, 'not-a-file.sql'));

    expect(discoverMigrationFiles(tempDir)).toEqual([path.resolve(tempDir, '001-real.js')]);
  });

  it('includes symlinks that resolve to regular .js/.sql files (fast-glob followSymbolicLinks parity)', async () => {
    const outsideDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-migrations-outside-'));
    try {
      const targetJs = path.join(outsideDir, 'target.js');
      const targetSql = path.join(outsideDir, 'target.sql');
      await fse.writeFile(targetJs, 'module.exports = {}');
      await fse.writeFile(targetSql, 'SELECT 1;');
      await fse.writeFile(path.join(tempDir, '001-real.js'), 'module.exports = {}');

      await fse.symlink(targetJs, path.join(tempDir, '002-linked.js'));
      await fse.symlink(targetSql, path.join(tempDir, '003-linked.sql'));

      expect(discoverMigrationFiles(tempDir)).toEqual([
        path.resolve(tempDir, '001-real.js'),
        path.resolve(tempDir, '002-linked.js'),
        path.resolve(tempDir, '003-linked.sql'),
      ]);
    } finally {
      await fse.remove(outsideDir);
    }
  });

  it('ignores symlinks to directories and broken symlinks', async () => {
    await fse.writeFile(path.join(tempDir, '001-real.js'), 'module.exports = {}');
    await fse.ensureDir(path.join(tempDir, 'nested'));
    await fse.symlink(path.join(tempDir, 'nested'), path.join(tempDir, '002-dir-link.js'));
    await fse.symlink(path.join(tempDir, 'missing-target.js'), path.join(tempDir, '003-broken.js'));

    expect(discoverMigrationFiles(tempDir)).toEqual([path.resolve(tempDir, '001-real.js')]);
  });
});
