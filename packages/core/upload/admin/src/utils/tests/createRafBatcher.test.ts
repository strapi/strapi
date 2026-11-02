import { createRafBatcher } from '../createRafBatcher';

describe('createRafBatcher', () => {
  let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }>;
  let nextId: number;
  let rafSpy: jest.Mock;
  let originalRaf: typeof requestAnimationFrame;
  let originalCancel: typeof cancelAnimationFrame;

  beforeEach(() => {
    rafCallbacks = [];
    nextId = 1;
    rafSpy = jest.fn((cb: FrameRequestCallback) => {
      const id = nextId;
      nextId += 1;
      rafCallbacks.push({ id, cb });
      return id;
    });

    originalRaf = global.requestAnimationFrame;
    originalCancel = global.cancelAnimationFrame;
    global.requestAnimationFrame = rafSpy as unknown as typeof requestAnimationFrame;
    global.cancelAnimationFrame = ((id: number) => {
      rafCallbacks = rafCallbacks.filter((entry) => entry.id !== id);
    }) as unknown as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancel;
  });

  const flushFrame = () => {
    const pending = rafCallbacks;
    rafCallbacks = [];
    pending.forEach((entry) => entry.cb(0));
  };

  it('flushes once with the latest value for multiple schedules in one frame', () => {
    const flush = jest.fn();
    const batcher = createRafBatcher<number>(flush);

    batcher.schedule(1);
    batcher.schedule(2);
    batcher.schedule(3);

    // Nothing flushed before the frame runs, and only one frame requested.
    expect(flush).not.toHaveBeenCalled();
    expect(rafSpy).toHaveBeenCalledTimes(1);

    flushFrame();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith(3);
  });

  it('does not flush after cancel()', () => {
    const flush = jest.fn();
    const batcher = createRafBatcher<number>(flush);

    batcher.schedule(1);
    batcher.cancel();

    flushFrame();

    expect(flush).not.toHaveBeenCalled();
  });

  it('starts a new frame for a schedule after a flush', () => {
    const flush = jest.fn();
    const batcher = createRafBatcher<number>(flush);

    batcher.schedule(1);
    flushFrame();
    expect(flush).toHaveBeenNthCalledWith(1, 1);

    batcher.schedule(2);
    expect(rafSpy).toHaveBeenCalledTimes(2);

    flushFrame();
    expect(flush).toHaveBeenNthCalledWith(2, 2);
  });
});
