import { Timer, timerFactory } from '../timer';

describe('Timer', () => {
  const FIXED_NOW = Date.now();

  beforeEach(() => {
    // Reset timers to a specific time before every test
    jest.useFakeTimers({ now: FIXED_NOW });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('Can create a timer using the factory', () => {
    const timer = timerFactory();

    expect(timer).toBeInstanceOf(Timer);
  });

  test('The start time should be set to "now" by default', () => {
    const timer = timerFactory();

    expect(timer.start).toBe(FIXED_NOW);
  });

  test('The end time should be set to "null" by default', () => {
    const timer = timerFactory();

    expect(timer.end).toBeNull();
  });

  test('The elapsed time (ms) should be 0 when created', () => {
    const timer = timerFactory();

    expect(timer.elapsedMs).toBe(0);
  });

  test('The elapsed time (ms) should be dynamic, depending on the current time', () => {
    const elapsedTimeMs = 250;
    const timer = timerFactory();

    jest.advanceTimersByTime(elapsedTimeMs);

    expect(timer.elapsedMs).toBe(elapsedTimeMs);
  });

  test('Calling .stop() should freeze the timer components', () => {
    const elapsedTimeMs = 42;
    const timer = timerFactory();

    jest.advanceTimersByTime(elapsedTimeMs);

    timer.stop();

    expect(timer.start).toBe(FIXED_NOW);
    expect(timer.end).toBe(FIXED_NOW + elapsedTimeMs);
    expect(timer.elapsedMs).toBe(elapsedTimeMs);
  });

  test(`Calling .reset() should reinitialize the timer's components based on the current time`, () => {
    const elapsedTimeMs = 42;
    const timer = timerFactory();

    jest.advanceTimersByTime(elapsedTimeMs);

    timer.stop();
    timer.reset();

    expect(timer.start).toBe(FIXED_NOW + elapsedTimeMs);
    expect(timer.end).toBe(null);
    expect(timer.elapsedMs).toBe(0);
  });
});
