import { Writable } from 'stream';

import { deferWritable } from '../defer-writable';

describe('deferWritable', () => {
  test('writes through once the destination opens and waits to end', async () => {
    const received: unknown[] = [];
    let resolveOpen: (destination: Writable) => void = () => {};
    const opened = new Promise<Writable>((resolve) => {
      resolveOpen = resolve;
    });

    const proxy = deferWritable(() => opened);
    const writeDone = new Promise<void>((resolve, reject) => {
      proxy.write({ id: 1 }, (error) => (error ? reject(error) : resolve()));
    });

    const destination = new Writable({
      objectMode: true,
      write(chunk, _encoding, callback) {
        received.push(chunk);
        callback();
      },
    });
    const finished = new Promise<void>((resolve) => {
      destination.on('finish', () => resolve());
    });

    resolveOpen(destination);
    await writeDone;
    proxy.end();
    await finished;

    expect(received).toEqual([{ id: 1 }]);
  });

  test('destroys the stream when opening fails', async () => {
    const openError = new Error("Cannot find module 'stream-chain'");
    const proxy = deferWritable(() => Promise.reject(openError));
    const received = await new Promise<Error>((resolve) => {
      proxy.once('error', resolve);
    });

    expect(received).toBe(openError);
  });
});
