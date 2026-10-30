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

  test('waits for drain when the destination applies backpressure', async () => {
    const received: unknown[] = [];
    const destination = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(chunk, _encoding, callback) {
        received.push(chunk);
        setTimeout(callback, 1);
      },
    });

    let resolveOpen: (destination: Writable) => void = () => {};
    const proxy = deferWritable(
      () =>
        new Promise<Writable>((resolve) => {
          resolveOpen = resolve;
        })
    );

    const items = Array.from({ length: 5 }, (_, id) => ({ id }));
    items.forEach((item) => proxy.write(item));
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    const finished = new Promise<void>((resolve) => {
      destination.on('finish', () => resolve());
    });
    resolveOpen(destination);
    proxy.end();
    await finished;

    expect(received).toEqual(items);
  });

  test('fails queued writes and the end when opening fails', async () => {
    const openError = new Error('open failed');
    let rejectOpen: (error: Error) => void = () => {};
    const proxy = deferWritable(
      () =>
        new Promise<Writable>((_resolve, reject) => {
          rejectOpen = reject;
        })
    );
    proxy.on('error', () => {});

    const writeError = new Promise<Error | null | undefined>((resolve) => {
      proxy.write({ id: 1 }, resolve);
    });
    proxy.end();

    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    rejectOpen(openError);

    expect(await writeError).toBe(openError);
    expect(proxy.destroyed).toBe(true);
  });

  test('destroys the stream when the destination errors', async () => {
    const destinationError = new Error('disk full');
    const destination = new Writable({
      objectMode: true,
      write(_chunk, _encoding, callback) {
        callback(destinationError);
      },
    });
    destination.on('error', () => {});

    const proxy = deferWritable(async () => destination);
    const received = new Promise<Error>((resolve) => {
      proxy.once('error', resolve);
    });

    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    proxy.write({ id: 1 });

    expect(await received).toBe(destinationError);
  });

  test('destroys a destination that opens after the stream was destroyed', async () => {
    const destination = new Writable({
      objectMode: true,
      write(_chunk, _encoding, callback) {
        callback();
      },
    });

    let resolveOpen: (destination: Writable) => void = () => {};
    const opened = new Promise<Writable>((resolve) => {
      resolveOpen = resolve;
    });
    const proxy = deferWritable(() => opened);

    const pendingWrite = new Promise<Error | null | undefined>((resolve) => {
      proxy.write({ id: 1 }, resolve);
    });
    proxy.on('error', () => {});
    proxy.destroy();

    expect(await pendingWrite).toBeInstanceOf(Error);

    resolveOpen(destination);
    await opened;
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(destination.destroyed).toBe(true);
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
