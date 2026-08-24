import { Readable } from 'stream';

import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

import { ProviderTransferError } from '../../../../errors/providers';
import { createLocalDirectoryDestinationProvider } from '..';
import { createLocalDirectorySourceProvider } from '../../source';

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

  test('persists metadataFallback on written sidecars so a rewrite hop keeps provenance', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-fallback-'));
    const dest = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    await dest.bootstrap({ report: jest.fn() } as never);

    const writable = dest.createAssetsWriteStream();
    const asset = {
      filename: 'small_launder.png',
      filepath: '/unused',
      stream: Readable.from([Buffer.from('png')]),
      stats: { size: 3 },
      metadataFallback: true,
      metadata: {
        id: 0,
        name: 'small_launder.png',
        hash: 'small_launder',
        type: 'small',
        mainHash: 'launder',
        mime: 'image/png',
        size: 0.01,
        url: '/small_launder.png',
      },
    };

    await new Promise<void>((resolve, reject) => {
      writable.write(asset, (err) => (err ? reject(err) : resolve()));
    });
    await new Promise<void>((resolve, reject) => {
      writable.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });

    const sidecar = await fs.readJson(
      path.join(dir, 'assets', 'metadata', 'small_launder.png.json')
    );
    expect(sidecar.metadataFallback).toBe(true);
    expect(sidecar.mainHash).toBe('launder');
    expect(sidecar.type).toBe('small');

    await fs.writeJson(path.join(dir, 'metadata.json'), {
      strapi: { version: '5.0.0' },
      createdAt: new Date().toISOString(),
    });

    const source = createLocalDirectorySourceProvider({ directory: { path: dir } });
    await source.bootstrap({ report: jest.fn() } as never);

    const assets: Array<{
      metadataFallback?: boolean;
      metadata?: { mainHash?: string; metadataFallback?: boolean };
    }> = [];
    for await (const chunk of source.createAssetsReadStream()) {
      assets.push(chunk);
      chunk.stream?.resume();
    }

    expect(assets).toHaveLength(1);
    expect(assets[0].metadataFallback).toBe(true);
    expect(assets[0].metadata).not.toHaveProperty('metadataFallback');
    expect(assets[0].metadata?.mainHash).toBe('launder');
  });
});
