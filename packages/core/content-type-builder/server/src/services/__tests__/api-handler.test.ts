import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import fse from 'fs-extra';

import * as apiHandler from '../api-handler';

describe('api-handler mutation backups', () => {
  let appRoot: string;
  const uid = 'api::article.article';

  beforeEach(async () => {
    appRoot = await mkdtemp(path.join(os.tmpdir(), 'ctb-api-handler-'));
    global.strapi = {
      contentTypes: { [uid]: { apiName: 'article', modelName: 'article' } },
      dirs: { app: { api: path.join(appRoot, 'src', 'api') } },
    } as any;

    await fse.outputFile(
      path.join(appRoot, 'src', 'api', 'article', 'controllers', 'article.ts'),
      'export default {}'
    );
    await fse.outputJson(
      path.join(appRoot, 'src', 'api', 'article', 'content-types', 'article', 'schema.json'),
      { kind: 'collectionType' }
    );
  });

  afterEach(async () => {
    await rm(appRoot, { recursive: true, force: true });
  });

  it('keeps an API backup until folder reconciliation commits, then restores the exact files', async () => {
    const apiFolder = path.join(appRoot, 'src', 'api', 'article');
    const backupFolder = path.join(appRoot, 'src', 'api', '.backup', 'article');

    await apiHandler.backup(uid);
    await apiHandler.clear(uid, { preserveBackup: true });

    await expect(fse.pathExists(apiFolder)).resolves.toBe(false);
    await expect(
      fse.readFile(path.join(backupFolder, 'controllers', 'article.ts'), 'utf8')
    ).resolves.toBe('export default {}');

    await apiHandler.rollback(uid);

    await expect(
      fse.readFile(path.join(apiFolder, 'controllers', 'article.ts'), 'utf8')
    ).resolves.toBe('export default {}');
    await expect(
      fse.readJson(path.join(apiFolder, 'content-types', 'article', 'schema.json'))
    ).resolves.toEqual({ kind: 'collectionType' });
    await expect(fse.pathExists(backupFolder)).resolves.toBe(false);
  });

  it('removes the preserved backup after a committed API deletion', async () => {
    const apiFolder = path.join(appRoot, 'src', 'api', 'article');
    const backupFolder = path.join(appRoot, 'src', 'api', '.backup', 'article');

    await apiHandler.backup(uid);
    await apiHandler.clear(uid, { preserveBackup: true });
    await apiHandler.finalize(uid);

    await expect(fse.pathExists(apiFolder)).resolves.toBe(false);
    await expect(fse.pathExists(backupFolder)).resolves.toBe(false);
  });

  it('replaces retained partial backup files before a later rollback', async () => {
    const apiFolder = path.join(appRoot, 'src', 'api', 'article');
    const backupFolder = path.join(appRoot, 'src', 'api', '.backup', 'article');

    // Simulates a previous partial/retained backup attempt that must never merge into a retry.
    await fse.outputFile(path.join(backupFolder, 'controllers', 'stale.ts'), 'stale');
    await fse.outputFile(path.join(apiFolder, 'services', 'article.ts'), 'export default {}');

    await apiHandler.backup(uid);
    await apiHandler.clear(uid, { preserveBackup: true });
    await apiHandler.rollback(uid);

    await expect(fse.pathExists(path.join(apiFolder, 'controllers', 'stale.ts'))).resolves.toBe(
      false
    );
    await expect(
      fse.readFile(path.join(apiFolder, 'controllers', 'article.ts'), 'utf8')
    ).resolves.toBe('export default {}');
    await expect(
      fse.readFile(path.join(apiFolder, 'services', 'article.ts'), 'utf8')
    ).resolves.toBe('export default {}');
    await expect(fse.pathExists(backupFolder)).resolves.toBe(false);
  });

  it('cleans a failed staging copy without altering the retained canonical backup', async () => {
    const apiFolder = path.join(appRoot, 'src', 'api', 'article');
    const backupRoot = path.join(appRoot, 'src', 'api', '.backup');
    const backupFolder = path.join(backupRoot, 'article');
    const stagingFolder = path.join(backupRoot, '.article.staging');
    await fse.outputFile(path.join(backupFolder, 'controllers', 'retained.ts'), 'retained');
    await fse.outputFile(path.join(stagingFolder, 'controllers', 'partial.ts'), 'partial');
    await fse.remove(apiFolder);

    await expect(apiHandler.backup(uid)).rejects.toThrow();

    await expect(fse.pathExists(stagingFolder)).resolves.toBe(false);
    await expect(
      fse.readFile(path.join(backupFolder, 'controllers', 'retained.ts'), 'utf8')
    ).resolves.toBe('retained');
  });
});
