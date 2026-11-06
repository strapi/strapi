import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';

import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

import { ProviderTransferError } from '../../../../errors/providers';
import * as esmDeps from '../../../../utils/esm-deps';
import { oversizedLast, oversizedThenMore } from '../../../../__tests__/test-utils';
import { createLocalDirectoryDestinationProvider } from '..';

jest.mock('../../../../utils/esm-deps', () => {
  const actual = jest.requireActual('../../../../utils/esm-deps') as typeof esmDeps;
  return {
    ...actual,
    loadStreamDeps: jest.fn((...args: Parameters<typeof actual.loadStreamDeps>) =>
      actual.loadStreamDeps(...args)
    ),
  };
});

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

  test.each([
    ['schemas', 'createSchemasWriteStream'],
    ['entities', 'createEntitiesWriteStream'],
    ['links', 'createLinksWriteStream'],
    ['configuration', 'createConfigurationWriteStream'],
  ] as const)('%s write stream writes JSONL files', async (stage, method) => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), `dts-dest-${stage}-`));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    const items = [{ id: 1 }, { id: 2, title: 'two' }];
    await pipeline(Readable.from(items), provider[method]());

    const filePath = path.join(dir, stage, `${stage}_00001.jsonl`);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content
      .split('\n')
      .filter((line) => line !== '')
      .map((line) => JSON.parse(line));
    expect(lines).toEqual(items);
  });

  test.each([
    ['is the last one', oversizedLast],
    ['is followed by more entities', oversizedThenMore],
  ])('an entity larger than maxSizeJsonl fails the write stream when it %s', async (_, source) => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-too-large-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: { maxSizeJsonl: 10 },
    });

    await provider.bootstrap({ report: jest.fn() } as never);

    await expect(
      pipeline(Readable.from(source()), provider.createEntitiesWriteStream())
    ).rejects.toThrow('payload too large');
  });

  test('entities write stream errors when stream packages fail to load', async () => {
    const loadError = new Error("Cannot find module 'stream-chain'");
    const loadStreamDeps = esmDeps.loadStreamDeps as jest.MockedFunction<
      typeof esmDeps.loadStreamDeps
    >;
    loadStreamDeps.mockRejectedValueOnce(loadError);

    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-load-fail-'));
    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });

    try {
      await provider.bootstrap({ report: jest.fn() } as never);
      const writeStream = provider.createEntitiesWriteStream();
      expect(writeStream).toBeInstanceOf(Writable);

      const streamError = new Promise((resolve) => {
        writeStream.once('error', resolve);
      });
      writeStream.write({ id: 1 });

      await expect(streamError).resolves.toBe(loadError);
    } finally {
      loadStreamDeps.mockReset();
      loadStreamDeps.mockImplementation(() =>
        jest.requireActual<typeof esmDeps>('../../../../utils/esm-deps').loadStreamDeps()
      );
    }
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
