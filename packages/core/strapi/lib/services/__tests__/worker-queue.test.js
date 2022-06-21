'use strict';

const WorkerQueue = require('../worker-queue');

describe('WorkerQueue', () => {
  test('Executes worker', () => {
    const fn = jest.fn();
    const input = 1;

    const q = new WorkerQueue({
      logger: console.log.bind(console),
      concurrency: 1,
    });
    q.subscribe(fn);

    q.enqueue(input);

    setTimeout(() => {
      expect(fn).toHaveBeenCalledWith(input);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  test('Executes worker', () => {
    const fn = jest.fn();
    const input = 1;

    const q = new WorkerQueue({
      logger: console.log.bind(console),
      concurrency: 1,
    });
    q.subscribe(fn);

    q.enqueue(input);
    q.enqueue(input);
    q.enqueue(input);

    setTimeout(() => {
      expect(fn).toHaveBeenCalledWith(input);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
