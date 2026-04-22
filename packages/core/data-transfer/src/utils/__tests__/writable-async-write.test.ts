import { Writable } from 'stream';

import { write } from '../writable-async-write';

describe('writable-async-write (write)', () => {
  const created: Writable[] = [];

  afterEach(() => {
    while (created.length) {
      created.pop()?.destroy();
    }
  });

  test('waits for drain when write returns false (slow consumer, low highWaterMark)', async () => {
    let drainCount = 0;
    const dest = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(_chunk, _encoding, callback) {
        setTimeout(callback, 2);
      },
    });
    created.push(dest);
    dest.on('drain', () => {
      drainCount += 1;
    });

    for (let i = 0; i < 12; i += 1) {
      await write(dest, { n: i });
    }

    expect(drainCount).toBeGreaterThan(0);
  });

  test('resolves when write returns true (room in buffer)', async () => {
    const dest = new Writable({
      objectMode: true,
      highWaterMark: 100,
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    created.push(dest);

    await expect(write(dest, { x: 1 })).resolves.toBeUndefined();
  });

  test('rejects when write callback receives an error', async () => {
    const dest = new Writable({
      objectMode: true,
      write(_chunk, _encoding, callback) {
        callback(new Error('sink error'));
      },
    });
    created.push(dest);

    await expect(write(dest, { x: 1 })).rejects.toThrow('sink error');
  });

  test('does not hang when writable is destroyed while awaiting drain (race with stream finished)', async () => {
    const dest = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(_chunk, _encoding, callback) {
        setTimeout(callback, 2);
      },
    });
    created.push(dest);

    const run = async () => {
      for (let i = 0; i < 30; i += 1) {
        if (i === 8) {
          setImmediate(() => {
            dest.destroy(new Error('aborted'));
          });
        }
        await write(dest, { n: i });
      }
    };

    await expect(run()).rejects.toThrow('aborted');
  });
});
