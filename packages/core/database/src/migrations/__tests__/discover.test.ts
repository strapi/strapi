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
});
