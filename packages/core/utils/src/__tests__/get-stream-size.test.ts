import { Readable } from 'node:stream';

import { getStreamSize } from '../file';

describe('getStreamSize', () => {
  it('resolves when a non-auto-destroying stream ends without closing', async () => {
    const stream = Readable.from([Buffer.from('hello'), Buffer.from(' world')], {
      autoDestroy: false,
    });

    try {
      await expect(getStreamSize(stream)).resolves.toBe(11);
      expect(stream.readableEnded).toBe(true);
      expect(stream.destroyed).toBe(false);
    } finally {
      stream.destroy();
    }
  });

  it('resolves when close events are disabled', async () => {
    const stream = Readable.from([Buffer.from('hello')], { emitClose: false });

    await expect(getStreamSize(stream)).resolves.toBe(5);
  });

  it('counts bytes rather than characters in decoded text', async () => {
    await expect(getStreamSize(Readable.from(['café', ' 🌍']))).resolves.toBe(
      Buffer.byteLength('café 🌍')
    );
  });

  it('counts binary data from a paused stream', async () => {
    const stream = Readable.from([Buffer.from([0, 255]), new Uint8Array([128, 1])]);
    stream.pause();

    await expect(getStreamSize(stream)).resolves.toBe(4);
  });

  it('returns zero for an empty stream', async () => {
    await expect(getStreamSize(Readable.from([]))).resolves.toBe(0);
  });

  it('rejects with the original stream error', async () => {
    const error = new Error('read failed');
    const stream = new Readable({
      read() {
        this.destroy(error);
      },
    });

    await expect(getStreamSize(stream)).rejects.toBe(error);
  });

  it('rejects a premature close rather than returning a partial size', async () => {
    const stream = new Readable({
      read() {
        this.push(Buffer.from('partial'));
        this.destroy();
      },
    });

    await expect(getStreamSize(stream)).rejects.toMatchObject({
      code: 'ERR_STREAM_PREMATURE_CLOSE',
    });
  });

  it('removes its listeners after completion', async () => {
    const stream = Readable.from([Buffer.from('hello')], { autoDestroy: false });
    const events = ['data', 'end', 'error', 'close'];
    const listenerCounts = events.map((event) => stream.listenerCount(event));

    try {
      await getStreamSize(stream);
      expect(events.map((event) => stream.listenerCount(event))).toEqual(listenerCounts);
    } finally {
      stream.destroy();
    }
  });
});
