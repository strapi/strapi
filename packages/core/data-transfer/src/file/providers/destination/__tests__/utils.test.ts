import { promises as fsp } from 'fs';
import type { Writable } from 'stream';
import tar from 'tar-stream';
import { createFilePathFactory, createTarEntryStream } from '../utils';
import { createDirectoryJsonlWriter } from '../../../../directory/providers/destination/utils';

describe('Local File Destination Provider - Utils', () => {
  describe('Create File Path Factory', () => {
    it('returns a function', () => {
      const filePathFactory = createFilePathFactory('entities');
      expect(typeof filePathFactory).toBe('function');
    });
    it('returns a file path when calling a function', () => {
      const type = 'entities';
      const fileIndex = 0;
      const filePathFactory = createFilePathFactory(type);

      const path = filePathFactory(fileIndex);

      expect(path).toBe(`${type}/${type}_0000${fileIndex}.jsonl`);
    });

    describe('returns file paths when calling the factory', () => {
      const cases = [
        ['schemas', 0, 'schemas/schemas_00000.jsonl'],
        ['entities', 5, 'entities/entities_00005.jsonl'],
        ['links', 11, 'links/links_00011.jsonl'],
        ['schemas', 543, 'schemas/schemas_00543.jsonl'],
        ['entities', 5213, 'entities/entities_05213.jsonl'],
        ['links', 33231, 'links/links_33231.jsonl'],
      ];

      test.each(cases)(
        'Given type: %s and fileIndex: %d, returns the right file path: %s',
        (...args) => {
          const [type, fileIndex, filePath] = args as [string, number, string];

          const filePathFactory = createFilePathFactory(type);

          const path = filePathFactory(fileIndex);

          expect(path).toBe(filePath);
        }
      );
    });
  });
  describe('Create Tar Entry Stream', () => {
    it('Throws an error when the payload is too large', async () => {
      const maxSize = 3;
      const chunk = 'test';
      const archive = tar.pack();
      const pathFactory = createFilePathFactory('entries');
      const tarEntryStream = createTarEntryStream(archive, pathFactory, maxSize);

      const write = async () =>
        new Promise((resolve, reject) => {
          tarEntryStream.on('finish', resolve);
          tarEntryStream.on('error', reject);
          tarEntryStream.write(chunk);
        });

      await expect(write).rejects.toThrow(`payload too large: ${chunk.length}>${maxSize}`);
    });
    it('Resolves when the payload is smaller than the max size', async () => {
      const maxSize = 30;
      const chunk = 'test';
      const archive = tar.pack();
      const pathFactory = createFilePathFactory('entries');
      const tarEntryStream = createTarEntryStream(archive, pathFactory, maxSize);

      // A chunk under maxSize is only buffered, so the stream never finishes on its own: wait for the
      // write callback instead
      const write = async () =>
        new Promise((resolve, reject) => {
          tarEntryStream.on('error', reject);
          tarEntryStream.write(chunk, (error) => (error ? reject(error) : resolve(undefined)));
        });

      await expect(write()).resolves.toBeUndefined();
    });

    const writeChunk = (writer: Writable, chunk: string) =>
      new Promise<Error | null | undefined>((resolve) => {
        writer.write(chunk, (error) => resolve(error));
      });

    const destroyWriter = (writer: Writable, error?: Error) =>
      new Promise<Error | null | undefined>((resolve) => {
        writer.once('close', () => resolve(undefined));
        writer.once('error', (err) => resolve(err));
        writer.destroy(error);
      });

    it('writes one entry into a real pack', async () => {
      const archive = tar.pack();
      const chunks: Buffer[] = [];
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      const ended = new Promise<void>((resolve, reject) => {
        archive.on('end', () => resolve());
        archive.on('error', reject);
      });
      const writer = createTarEntryStream(archive, createFilePathFactory('entries'), 100);

      expect(await writeChunk(writer, 'hello')).toBeFalsy();
      expect(await destroyWriter(writer)).toBeFalsy();
      archive.finalize();
      await ended;

      expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    });

    it('rejects a flush when a real pack has already finalized', async () => {
      const archive = tar.pack();
      archive.resume();
      archive.finalize();
      const writer = createTarEntryStream(archive, createFilePathFactory('entries'), 100);

      expect(await writeChunk(writer, 'hello')).toBeFalsy();
      await expect(destroyWriter(writer)).resolves.toEqual(
        expect.objectContaining({
          message: 'Cannot write a tar entry after the archive has closed',
        })
      );
    });

    it('rejects a flush when a real pack is already piping an entry', async () => {
      const archive = tar.pack();
      archive.resume();
      const openEntry = archive.entry({ name: 'assets/open.txt', size: 4 });
      const writer = createTarEntryStream(archive, createFilePathFactory('entries'), 100);

      try {
        expect(await writeChunk(writer, 'hello')).toBeFalsy();
        await expect(destroyWriter(writer)).resolves.toEqual(
          expect.objectContaining({ message: 'already piping an entry' })
        );
      } finally {
        openEntry.destroy();
        archive.destroy();
      }
    });
  });
  describe.each([
    ['tar entry stream', 'tar'],
    ['directory JSONL writer', 'directory'],
  ] as const)('Entry writer flush handling: %s', (_name, kind) => {
    type EntryCallback = (error?: Error | null) => void;

    // Called with each entry's content, the test decides when and how it settles
    let onEntry: (content: string, done: EntryCallback) => void;
    let written: string[];

    const createWriter = (maxSize: number): Writable => {
      const pathFactory = createFilePathFactory('entries');

      if (kind === 'tar') {
        const archive = {
          // A real pack returns a stream when it accepts an entry. Undefined means it dropped
          // the callback, which writeEntry treats as a failure.
          entry(_header: unknown, content: string, done: EntryCallback) {
            onEntry(content, done);
            return {} as ReturnType<tar.Pack['entry']>;
          },
        } as unknown as tar.Pack;

        return createTarEntryStream(archive, pathFactory, maxSize);
      }

      jest.spyOn(fsp, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fsp, 'writeFile').mockImplementation(
        (_target, content) =>
          new Promise<void>((resolve, reject) => {
            onEntry(String(content), (error) => (error ? reject(error) : resolve()));
          })
      );

      return createDirectoryJsonlWriter('/tmp/root', pathFactory, maxSize);
    };

    beforeEach(() => {
      written = [];
      onEntry = (content, done) => {
        written.push(content);
        done();
      };
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const tick = () =>
      new Promise<void>((resolve) => {
        setImmediate(resolve);
      });

    const writeChunk = (writer: Writable, chunk: string) =>
      new Promise<Error | null | undefined>((resolve) => {
        writer.write(chunk, (error) => resolve(error));
      });

    const destroyWriter = (writer: Writable, error?: Error) =>
      new Promise<Error | null | undefined>((resolve) => {
        writer.once('close', () => resolve(undefined));
        writer.once('error', (err) => resolve(err));
        writer.destroy(error);
      });

    it('passes a rotation flush failure to the write callback', async () => {
      const flushError = new Error('flush failed');
      onEntry = (_content, done) => done(flushError);

      const writer = createWriter(5);
      writer.on('error', () => {});

      expect(await writeChunk(writer, 'abc')).toBeFalsy();
      expect(await writeChunk(writer, 'def')).toBe(flushError);
    });

    it('passes a flush failure on an error-free destroy to the destroy callback', async () => {
      const flushError = new Error('flush failed');
      onEntry = (_content, done) => done(flushError);

      const writer = createWriter(100);
      expect(await writeChunk(writer, 'abc')).toBeFalsy();

      await expect(destroyWriter(writer)).resolves.toBe(flushError);
    });

    it('flushes the buffer on an error-free destroy', async () => {
      const writer = createWriter(100);
      expect(await writeChunk(writer, 'abc')).toBeFalsy();

      await destroyWriter(writer);

      expect(written).toEqual(['abc']);
    });

    it('does not flush the buffer when destroyed with an error', async () => {
      const writer = createWriter(100);
      expect(await writeChunk(writer, 'abc')).toBeFalsy();

      const destroyError = new Error('stage failed');
      await expect(destroyWriter(writer, destroyError)).resolves.toBe(destroyError);

      expect(written).toEqual([]);
    });

    it('waits for an in-flight flush before the error destroy callback and discards the rest', async () => {
      let finishEntry: EntryCallback = () => {};
      onEntry = (content, done) => {
        written.push(content);
        finishEntry = done;
      };

      const writer = createWriter(5);
      expect(await writeChunk(writer, 'abc')).toBeFalsy();

      // Rotation starts a flush of 'abc' that stays in flight
      const rotation = writeChunk(writer, 'def');
      await tick();
      expect(written).toEqual(['abc']);

      const destroyError = new Error('stage failed');
      let destroyed = false;
      const destroy = destroyWriter(writer, destroyError).then((result) => {
        destroyed = true;
        return result;
      });

      await tick();
      expect(destroyed).toBe(false);

      finishEntry();
      await rotation;

      await expect(destroy).resolves.toBe(destroyError);
      // 'def' was not part of the running flush, so it is never written
      expect(written).toEqual(['abc']);
    });

    it('keeps the original error when an in-flight flush fails during an error destroy', async () => {
      let finishEntry: EntryCallback = () => {};
      onEntry = (_content, done) => {
        finishEntry = done;
      };

      const unhandled = jest.fn();
      process.on('unhandledRejection', unhandled);

      try {
        const writer = createWriter(5);
        expect(await writeChunk(writer, 'abc')).toBeFalsy();

        const rotation = writeChunk(writer, 'def');
        await tick();

        const destroyError = new Error('stage failed');
        const destroy = destroyWriter(writer, destroyError);

        finishEntry(new Error('flush failed'));
        await rotation;

        await expect(destroy).resolves.toBe(destroyError);
        await tick();
        expect(unhandled).not.toHaveBeenCalled();
      } finally {
        process.off('unhandledRejection', unhandled);
      }
    });
  });
});
