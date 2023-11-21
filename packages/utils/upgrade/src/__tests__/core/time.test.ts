import { createTimer } from '../../core';

describe('Time', () => {
  const now = Date.now();

  beforeEach(() => {
    jest.useFakeTimers({ now });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Timer is initialized to current date', () => {
    const timer = createTimer();

    expect(timer.start).toStrictEqual(now);
    expect(timer.end).toBeNull();
  });

  test('Elapsed value dynamically adapt to system time', () => {
    const timer = createTimer();

    expect(timer.elapsed).toBe(0);
    jest.advanceTimersByTime(100);
    expect(timer.elapsed).toBe(100);
  });

  test('Upon calling stop, the timer should freeze', () => {
    const delta = 42;
    const expectedEndTime = now + delta;
    const timer = createTimer();

    jest.advanceTimersByTime(delta);

    timer.stop();

    expect(timer.end).toBe(expectedEndTime);
    expect(timer.elapsed).toBe(delta);
  });

  test('Upon calling reset, the timer components should be updated', () => {
    const delta = 100;
    const expectedNewStart = now + 2 * delta;
    const timer = createTimer();

    expect(timer.start).toBe(now);

    jest.advanceTimersByTime(delta);
    timer.stop();

    jest.advanceTimersByTime(delta);
    timer.reset();

    expect(timer.start).toBe(expectedNewStart);
    expect(timer.end).toBeNull();
    expect(timer.elapsed).toBe(0);
  });
});
