import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

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

  test('close waits until the last JSONL file is fully written', async () => {
    const linkCount = 100_000;
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-links-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    const links = Readable.from(
      (function* generateLinks() {
        for (let index = 0; index < linkCount; index += 1) {
          yield {
            kind: 'relation.basic',
            relation: 'manyToOne',
            left: { type: 'api::foo.foo', ref: index, field: 'bar' },
            right: { type: 'api::bar.bar', ref: index },
          };
        }
      })()
    );

    // Mirrors the engine: await the stage pipeline, then close the provider, then the CLI exits
    await pipeline(links, provider.createLinksWriteStream());
    await provider.close();

    const content = await fs.readFile(path.join(dir, 'links', 'links_00001.jsonl'), 'utf8');
    const lines = content.split('\n').filter(Boolean);

    expect(lines).toHaveLength(linkCount);
    expect(JSON.parse(lines[lines.length - 1]).left.ref).toBe(linkCount - 1);
  });

  test('close does not hang when a stage stream is destroyed without being used', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-skip-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    // Mirrors the engine's skip path in transferStage()
    const stream = provider.createConfigurationWriteStream();
    await new Promise((resolve, reject) => {
      stream.on('close', resolve).on('error', reject).destroy();
    });

    await expect(provider.close()).resolves.toBeUndefined();
  });
});
