import WorkerQueue from '../worker-queue';

describe('WorkerQueue', () => {
  test('Executes worker', async () => {
    const fn = jest.fn();
    const input = 1;

    const q = new WorkerQueue({
      logger: console.log.bind(console),
      concurrency: 1,
    } as any);
    q.subscribe(fn);

    q.enqueue(input);

    await new Promise((resolve) => {
      setTimeout(resolve);
    });

    expect(fn).toHaveBeenCalledWith(input);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('Executes worker', async () => {
    const fn = jest.fn();
    const input = 1;

    const q = new WorkerQueue({
      logger: console.log.bind(console),
      concurrency: 1,
    } as any);
    q.subscribe(fn);

    q.enqueue(input);
    q.enqueue(input);
    q.enqueue(input);

    await new Promise((resolve) => {
      setTimeout(resolve);
    });

    expect(fn).toHaveBeenCalledWith(input);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
