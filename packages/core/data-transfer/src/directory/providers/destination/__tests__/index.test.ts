import { Readable } from 'stream';
import { promises as nodeFsPromises } from 'fs';

import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

import { ProviderTransferError } from '../../../../errors/providers';
import { createLocalDirectoryDestinationProvider } from '..';

describe('Directory destination provider', () => {
  test('bootstrap creates root and sets results.file', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    expect(await fs.pathExists(dir)).toBe(true);
    expect(provider.results.file?.path).toBe(dir);
  });

  test('close does not recreate an export after rollback', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-rollback-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    await provider.bootstrap({ report: jest.fn() } as never);
    await provider.rollback();
    await provider.close();

    expect(await fs.pathExists(dir)).toBe(false);
  });

  test('createAssetsWriteStream surfaces sync fs errors as ProviderTransferError (engine-reportable)', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-assets-err-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    const mkdirSyncSpy = jest.spyOn(fs, 'mkdirSync').mockImplementationOnce(() => {
      throw Object.assign(new Error('mock EACCES'), { code: 'EACCES' });
    });

    const writable = provider.createAssetsWriteStream();
    // Writable invokes write(cb) with err and also emits `error`; listen so Node does not treat it as unhandled.
    writable.on('error', () => {});

    const asset = {
      filename: 'photo.png',
      filepath: '/unused',
      stream: Readable.from([]),
      stats: { size: 0 },
      metadata: {} as never,
    };

    const err: unknown = await new Promise((resolve) => {
      writable.write(asset, (e) => resolve(e));
    });

    mkdirSyncSpy.mockRestore();

    expect(err).toBeInstanceOf(ProviderTransferError);
    expect((err as ProviderTransferError).message).toContain('photo.png');
    const nested = (err as ProviderTransferError).details as {
      details?: { details?: { error?: Error } };
    };
    expect(nested?.details?.details?.error).toBeInstanceOf(Error);
    expect(nested?.details?.details?.error?.message).toBe('mock EACCES');
  });

  test('close waits for pending jsonl flushes, so a process exit after close cannot truncate files', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-flush-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    // Simulate a slow disk: without waiting in close(), the flush is still in flight
    // when close() returns (the CLI exits right after, truncating the file).
    const realWriteFile = nodeFsPromises.writeFile.bind(nodeFsPromises);
    const writeFileSpy = jest
      .spyOn(nodeFsPromises, 'writeFile')
      .mockImplementation(async (...args: Parameters<typeof realWriteFile>) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
        return realWriteFile(...args);
      });

    try {
      const configuration = provider.createConfigurationWriteStream();
      configuration.write({ type: 'core-store', value: { key: 'k', value: { some: 'config' } } });
      // Mirrors the engine/CLI behavior: the stage stream is ended, but nothing awaits
      // the writer's final flush before close() is called.
      configuration.end();

      await provider.close();

      const file = path.join(dir, 'configuration', 'configuration_00001.jsonl');
      const content = await fs.readFile(file, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(1);
      expect(() => JSON.parse(lines[0])).not.toThrow();
    } finally {
      writeFileSpy.mockRestore();
    }
  });
});
