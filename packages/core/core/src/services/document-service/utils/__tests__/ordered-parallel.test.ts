import { runParallelWithOrderedErrors } from '../ordered-parallel';

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

describe('runParallelWithOrderedErrors', () => {
  it('returns results in the original order', async () => {
    const first = createDeferred<number>();
    const second = createDeferred<number>();

    const run = runParallelWithOrderedErrors([first.promise, second.promise]);

    second.resolve(2);
    first.resolve(1);

    await expect(run).resolves.toEqual([1, 2]);
  });

  it('throws the first error in array order, regardless of timing', async () => {
    const first = createDeferred<number>();
    const second = createDeferred<number>();

    const run = runParallelWithOrderedErrors([first.promise, second.promise]);

    second.reject(new Error('second'));
    first.reject(new Error('first'));

    await expect(run).rejects.toThrow('first');
  });
});
