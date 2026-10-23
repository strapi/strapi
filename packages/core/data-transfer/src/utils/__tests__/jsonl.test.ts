import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { parser, stringer } from '../jsonl';

describe('JSONL streams', () => {
  test('parses records across chunks and preserves line keys', async () => {
    const records: Array<{ key: string; value: unknown }> = [];
    const output = new Writable({
      objectMode: true,
      write(record, _encoding, callback) {
        records.push(record);
        callback();
      },
    });

    await pipeline(
      Readable.from([Buffer.from('{"id":1}\n{"id"'), Buffer.from(':2}\r\n')]),
      parser({ checkErrors: true }),
      output
    );

    expect(records).toEqual([
      { key: '0', value: { id: 1 } },
      { key: '1', value: { id: 2 } },
    ]);
  });

  test('stringifies records as newline-delimited JSON', async () => {
    const chunks: Buffer[] = [];
    const output = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });

    await pipeline(Readable.from([{ id: 1 }, { nested: { value: true } }]), stringer(), output);

    expect(Buffer.concat(chunks).toString()).toBe('{"id":1}\n{"nested":{"value":true}}\n');
  });

  test('reports malformed records as stream errors', async () => {
    await expect(
      pipeline(Readable.from(['{"valid":true}\n{"invalid":']), parser(), new Writable())
    ).rejects.toThrow(SyntaxError);
  });
});
