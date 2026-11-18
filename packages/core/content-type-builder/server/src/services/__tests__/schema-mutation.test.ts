import os from 'os';
import path from 'path';
import * as fse from 'fs-extra';

import { rollbackSchemaMutation } from '../schema-mutation';

const createApiHandler = (calls: string[]) => ({
  async rollback(uid: string) {
    calls.push(`api:${uid}`);
  },
  async clearGenerated(apiName: string) {
    calls.push(`generated:${apiName}`);
  },
  finalize() {
    return Promise.resolve();
  },
});

describe('schema mutation rollback', () => {
  it('continues generated cleanup and every API restore after earlier compensation failures', async () => {
    const calls: string[] = [];

    await expect(
      rollbackSchemaMutation({
        builder: {
          async rollback() {
            calls.push('schema');
            throw new Error('schema rollback failed');
          },
        },
        apiHandler: {
          async rollback(uid) {
            calls.push(`api:${uid}`);
            if (uid === 'api::first.first') throw new Error('first API rollback failed');
          },
          async clearGenerated(apiName) {
            calls.push(`generated:${apiName}`);
          },
          finalize() {
            return Promise.resolve();
          },
        },
        backedUpApiUids: ['api::first.first', 'api::second.second'],
        generatedApiNames: ['created-before-schema-dir'],
      })
    ).rejects.toThrow('schema rollback failed');

    expect(calls).toEqual([
      'generated:created-before-schema-dir',
      'schema',
      'api:api::first.first',
      'api:api::second.second',
    ]);
  });

  it('removes the generated migration file and continues when later compensation fails', async () => {
    const dir = await fse.mkdtemp(path.join(os.tmpdir(), 'ctb-rollback-'));
    const migrationFilePath = path.join(dir, '2026.09.23T00.00.00.000.rename-fields.js');
    await fse.writeFile(migrationFilePath, 'module.exports = {}');
    const calls: string[] = [];

    try {
      await expect(
        rollbackSchemaMutation({
          builder: {
            async rollback() {
              calls.push('schema');
              throw new Error('schema rollback failed');
            },
          },
          apiHandler: createApiHandler(calls),
          backedUpApiUids: ['api::first.first'],
          generatedApiNames: ['generated'],
          migrationFilePath,
        })
      ).rejects.toThrow('schema rollback failed');

      expect(await fse.pathExists(migrationFilePath)).toBe(false);
      expect(calls).toEqual(['generated:generated', 'schema', 'api:api::first.first']);
    } finally {
      await fse.remove(dir);
    }
  });

  it('is a no-op when the migration file no longer exists', async () => {
    const calls: string[] = [];
    const migrationFilePath = path.join(os.tmpdir(), 'ctb-rollback-missing', 'never-written.js');

    await expect(
      rollbackSchemaMutation({
        builder: {
          async rollback() {
            calls.push('schema');
          },
        },
        apiHandler: createApiHandler(calls),
        migrationFilePath,
      })
    ).resolves.toBeUndefined();

    expect(calls).toEqual(['schema']);
  });
});
