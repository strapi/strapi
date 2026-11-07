import { promises as fsp } from 'fs';
import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';

import fs from 'fs-extra';
import { tmpdir } from 'os';
import path from 'path';

import { createTransferEngine } from '../../../../engine';
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
    const parent = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-rollback-'));
    const dir = path.join(parent, 'export');
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

  test('rollback of an existing directory keeps files the export did not write', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-rollback-keep-'));
    const notesPath = path.join(dir, 'notes.txt');
    await fs.writeFile(notesPath, 'keep');
    await fs.outputFile(path.join(dir, 'entities', 'old.jsonl'), '{"id":1}\n');

    const provider = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    provider.setMetadata('source', {
      createdAt: new Date().toISOString(),
      strapi: { version: '5.0.0' },
    });

    await provider.bootstrap({ report: jest.fn() } as never);
    await pipeline(Readable.from([{ id: 2 }]), provider.createEntitiesWriteStream());
    await provider.rollback();
    await provider.close();

    expect(await fs.readFile(notesPath, 'utf8')).toBe('keep');
    expect(await fs.pathExists(path.join(dir, 'entities'))).toBe(false);
    expect(await fs.pathExists(path.join(dir, 'metadata.json'))).toBe(false);
    expect(await fs.pathExists(dir)).toBe(true);
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

  test('an aborted stage does not write its partial JSONL file', async () => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'dts-dest-abort-'));
    const written: string[] = [];
    const originalWriteFile = fsp.writeFile.bind(fsp);
    const writeFile = jest.spyOn(fsp, 'writeFile').mockImplementation((file, data, options) => {
      written.push(String(file));
      return originalWriteFile(file, data, options);
    });

    const destination = createLocalDirectoryDestinationProvider({
      directory: { path: dir },
      file: {},
    });
    const createEntitiesWriteStream = destination.createEntitiesWriteStream.bind(destination);
    destination.createEntitiesWriteStream = () => {
      const stream = createEntitiesWriteStream();
      const write = stream.write.bind(stream);
      stream.write = ((chunk: unknown, encoding?: unknown, cb?: unknown) => {
        const callback = typeof encoding === 'function' ? encoding : cb;
        const enc = typeof encoding === 'function' ? undefined : encoding;

        return write(chunk, enc as BufferEncoding, (error?: Error | null) => {
          // The line is in the entry buffer now. Abort before the stage ends so the
          // only way it reaches disk is a flush from destroy().
          setImmediate(() => {
            engine.abortTransfer().catch(() => {});
          });

          if (typeof callback === 'function') {
            callback(error);
          }
        });
      }) as typeof stream.write;

      return stream;
    };
    let started = false;
    const source = {
      type: 'source' as const,
      name: 'abort-source',
      getMetadata: async () => ({
        createdAt: new Date().toISOString(),
        strapi: { version: '5.0.0' },
      }),
      createEntitiesReadStream() {
        return new Readable({
          objectMode: true,
          read() {
            if (started) {
              return;
            }

            started = true;
            this.push({ type: 'api::foo.foo', id: 1, data: { title: 'buffered' } });
          },
        });
      },
    };
    const engine = createTransferEngine(source, destination, {
      versionStrategy: 'ignore',
      schemaStrategy: 'ignore',
      exclude: [],
    });

    try {
      await expect(engine.transfer()).rejects.toThrow(/abort/i);
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      expect(written.filter((file) => file.includes(`${path.sep}entities${path.sep}`))).toEqual([]);
      expect(await fs.pathExists(path.join(dir, 'entities'))).toBe(false);
    } finally {
      writeFile.mockRestore();
      await fs.remove(dir);
    }
  });
});
