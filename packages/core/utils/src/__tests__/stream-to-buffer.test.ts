import { Readable } from 'node:stream';

import { streamToBuffer } from '../file';

describe('streamToBuffer', () => {
  it('buffers strings emitted by Readable.from', async () => {
    const stream = Readable.from(['hello', ' ', 'world']);

    await expect(streamToBuffer(stream)).resolves.toEqual(Buffer.from('hello world'));
  });

  it('buffers decoded UTF-8 data with a multibyte character split between chunks', async () => {
    const input = Buffer.from('café 🌍');
    const stream = Readable.from([input.subarray(0, 4), input.subarray(4, 8), input.subarray(8)]);
    stream.setEncoding('utf8');

    await expect(streamToBuffer(stream)).resolves.toEqual(input);
  });

  it('preserves binary buffers and Uint8Array chunks', async () => {
    const stream = Readable.from([Buffer.from([0, 255]), new Uint8Array([128, 1])]);

    await expect(streamToBuffer(stream)).resolves.toEqual(Buffer.from([0, 255, 128, 1]));
  });

  it('handles mixed binary and string chunks', async () => {
    const stream = Readable.from([Buffer.from('hello '), 'café']);

    await expect(streamToBuffer(stream)).resolves.toEqual(Buffer.from('hello café'));
  });

  it('returns an empty buffer for an empty stream', async () => {
    await expect(streamToBuffer(Readable.from([]))).resolves.toEqual(Buffer.alloc(0));
  });

  it('rejects with the original stream error', async () => {
    const error = new Error('read failed');
    const stream = new Readable({
      read() {
        this.destroy(error);
      },
    });

    await expect(streamToBuffer(stream)).rejects.toBe(error);
  });
});
