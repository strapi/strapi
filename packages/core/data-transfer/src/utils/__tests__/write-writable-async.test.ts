import { Writable } from 'stream';

import { writeWritableAsync } from '../write-writable-async';

describe('writeWritableAsync', () => {
  test('resolves after each chunk is written (no backpressure)', async () => {
    const written: Buffer[] = [];
    const w = new Writable({
      write(chunk, _enc, cb) {
        written.push(Buffer.from(chunk));
        cb();
      },
    });

    await writeWritableAsync(w, Buffer.from('x'));
    await writeWritableAsync(w, Buffer.from('y'));

    expect(written.map((b) => b.toString()).join('')).toBe('xy');
  });

  test('handles write() returning false by waiting for drain (backpressure)', async () => {
    const written: Buffer[] = [];
    let writeCalls = 0;

    const w = new Writable({
      highWaterMark: 1,
      write(chunk, _enc, cb) {
        writeCalls += 1;
        written.push(Buffer.from(chunk));
        setImmediate(cb);
      },
    });

    const chunks = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c'), Buffer.from('d')];
    for (const c of chunks) {
      await writeWritableAsync(w, c);
    }

    expect(written.map((b) => b.toString()).join('')).toBe('abcd');
    expect(writeCalls).toBe(4);
  });

  test('rejects when write callback receives an error', async () => {
    const w = new Writable({
      write(_chunk, _enc, cb) {
        cb(new Error('boom'));
      },
    });

    await expect(writeWritableAsync(w, Buffer.from('x'))).rejects.toThrow('boom');
  });

  test('rejects when stream is not writable', async () => {
    const w = new Writable({
      write(_chunk, _enc, cb) {
        cb();
      },
    });
    w.end();

    await expect(writeWritableAsync(w, Buffer.from('x'))).rejects.toThrow('Stream is not writable');
  });

  test('objectMode writes preserve order under backpressure', async () => {
    const written: unknown[] = [];
    const w = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(chunk, _enc, cb) {
        written.push(chunk);
        setImmediate(cb);
      },
    });

    for (const n of [1, 2, 3, 4, 5]) {
      await writeWritableAsync(w, n);
    }

    expect(written).toEqual([1, 2, 3, 4, 5]);
  });
});
