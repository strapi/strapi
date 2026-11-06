import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';

import { createJsonlWriteStream } from '../jsonl-write-stream';

/** Collects JSONL text and only stores it when destroyed, like the tar entry writer. */
const createFlushOnDestroyWriter = () => {
  const flushed: string[] = [];
  let buffer = '';

  const writer = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      buffer += chunk.toString();
      callback();
    },
    destroy(error, callback) {
      setTimeout(() => {
        flushed.push(buffer);
        callback(error);
      }, 10);
    },
  });

  return { writer, flushed };
};

describe('createJsonlWriteStream', () => {
  test('writes one JSON line per chunk and finishes after the entry stream closes', async () => {
    const { writer, flushed } = createFlushOnDestroyWriter();

    await pipeline(Readable.from([{ id: 1 }, { id: 2 }]), createJsonlWriteStream(writer));

    expect(flushed).toEqual(['{"id":1}\n{"id":2}']);
  });

  test('fails when the entry stream errors after the input ended', async () => {
    const writer = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
      final(callback) {
        setTimeout(() => callback(new Error('flush failed')), 10);
      },
    });

    await expect(
      pipeline(Readable.from([{ id: 1 }]), createJsonlWriteStream(writer))
    ).rejects.toThrow('flush failed');
  });

  test('fails when the entry stream errors while input is still flowing', async () => {
    const writer = new Writable({
      write(_chunk, _encoding, callback) {
        setTimeout(() => callback(new Error('write failed')), 0);
      },
    });

    async function* source() {
      yield { id: 1 };
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      yield { id: 2 };
    }

    await expect(pipeline(Readable.from(source()), createJsonlWriteStream(writer))).rejects.toThrow(
      'write failed'
    );
  });
});
