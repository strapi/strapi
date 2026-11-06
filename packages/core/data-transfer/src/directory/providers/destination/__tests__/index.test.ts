import nodeFs from 'fs';
import { Readable } from 'stream';

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

  test('close waits for pending JSONL file writes before resolving', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-flush-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    // Simulate a slow disk: the stream's final flush outlives the pipeline's `finish`
    const realWriteFile = nodeFs.promises.writeFile;
    let writeDone = false;
    const writeFileSpy = jest
      .spyOn(nodeFs.promises, 'writeFile')
      .mockImplementation(async (...args: Parameters<typeof realWriteFile>) => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
        await realWriteFile(...args);
        writeDone = true;
      });

    const stream = provider.createConfigurationWriteStream();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve).on('error', reject);
      stream.end({ type: 'core-store', value: { key: 'k', value: 'v' } });
    });

    await provider.close();
    writeFileSpy.mockRestore();

    expect(writeDone).toBe(true);
    const written = await fs.readFile(
      path.join(dir, 'configuration', 'configuration_00001.jsonl'),
      'utf8'
    );
    expect(JSON.parse(written.trim())).toEqual({
      type: 'core-store',
      value: { key: 'k', value: 'v' },
    });
  });

  test('close resolves when the engine destroys a write stream it had no source for', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-unused-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    // What the engine does for a stage whose source has no read stream: destroy the outer stream only
    const stream = provider.createSchemasWriteStream();
    await new Promise((resolve) => {
      stream.on('close', resolve).destroy();
    });

    let timer: NodeJS.Timeout | undefined;
    const outcome = await Promise.race([
      provider.close().then(() => 'closed'),
      new Promise((resolve) => {
        timer = setTimeout(() => resolve('hung'), 1000);
      }),
    ]);
    clearTimeout(timer);

    expect(outcome).toBe('closed');
    expect(await fs.pathExists(path.join(dir, 'metadata.json'))).toBe(true);
  });

  test('close fails without writing metadata when a final JSONL flush fails', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-flush-fail-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    // Fails after the outer stream has already finished, so nothing in the stage sees it
    const writeFileSpy = jest
      .spyOn(nodeFs.promises, 'writeFile')
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 50);
        });
        throw Object.assign(new Error('mock ENOSPC'), { code: 'ENOSPC' });
      });

    const stream = provider.createConfigurationWriteStream();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve).on('error', reject);
      stream.end({ type: 'core-store', value: { key: 'k', value: 'v' } });
    });

    await expect(provider.close()).rejects.toThrow(ProviderTransferError);
    writeFileSpy.mockRestore();

    expect(await fs.pathExists(path.join(dir, 'metadata.json'))).toBe(false);
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
});
