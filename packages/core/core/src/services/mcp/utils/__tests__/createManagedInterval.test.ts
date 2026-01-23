import { createManagedInterval } from '../createManagedInterval';

describe('createManagedInterval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('starts interval and calls callback at specified interval', () => {
    const callback = jest.fn();
    const interval = createManagedInterval();

    interval.start(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  test('clears interval when clear is called', () => {
    const callback = jest.fn();
    const interval = createManagedInterval();

    interval.start(callback, 1000);

    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    interval.clear();

    jest.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledTimes(1); // Should not increase
  });

  test('clears existing interval when start is called again', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const interval = createManagedInterval();

    // Start first interval
    interval.start(callback1, 1000);

    jest.advanceTimersByTime(1000);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Start second interval - should clear first one
    interval.start(callback2, 500);

    // Advance by first interval time
    jest.advanceTimersByTime(1000);
    // First callback should not be called again
    expect(callback1).toHaveBeenCalledTimes(1);
    // Second callback should be called twice (500ms * 2 = 1000ms)
    expect(callback2).toHaveBeenCalledTimes(2);
  });

  test('handles clear when no interval is active', () => {
    const interval = createManagedInterval();

    // Should not throw
    expect(() => interval.clear()).not.toThrow();
  });

  test('handles multiple clear calls', () => {
    const callback = jest.fn();
    const interval = createManagedInterval();

    interval.start(callback, 1000);
    interval.clear();
    interval.clear(); // Second clear

    // Should not throw and callback should not be called
    expect(() => interval.clear()).not.toThrow();
    jest.advanceTimersByTime(2000);
    expect(callback).not.toHaveBeenCalled();
  });

  test('can restart interval after clearing', () => {
    const callback = jest.fn();
    const interval = createManagedInterval();

    interval.start(callback, 1000);
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    interval.clear();
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1); // No additional calls

    // Restart
    interval.start(callback, 1000);
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2); // Called again
  });
});
