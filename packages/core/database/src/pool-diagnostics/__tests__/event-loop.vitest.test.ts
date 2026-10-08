import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEventLoopMonitor, toDelayMs, type EventLoopMonitor } from '../event-loop';

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const blockFor = (ms: number) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // keep the event loop busy on purpose
  }
};

describe('toDelayMs', () => {
  it('removes the 20 ms sampling interval and rounds to ms', () => {
    expect(toDelayMs(20_100_000)).toBe(0);
    expect(toDelayMs(21_200_000)).toBe(1);
    expect(toDelayMs(718_800_000)).toBe(699);
  });

  it('never goes below zero', () => {
    expect(toDelayMs(5_000_000)).toBe(0);
  });
});

describe('createEventLoopMonitor', () => {
  let monitor: EventLoopMonitor | undefined;

  // The rotation timer is faked so a test can step through rotations. The histograms sample on a
  // native timer, so a histogram that was just cleared still needs real ticks before it has data.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    monitor?.stop();
    monitor = undefined;
    vi.useRealTimers();
  });

  const untilSampled = (target: EventLoopMonitor) =>
    vi.waitFor(() => expect(target.read()).toBeDefined());

  it('reports nothing before the first sample', () => {
    monitor = createEventLoopMonitor();

    expect(monitor.read()).toBeUndefined();
  });

  it('sees a blocked event loop', async () => {
    monitor = createEventLoopMonitor();
    await untilSampled(monitor);
    setTimeout(() => blockFor(200), 0);
    await sleep(300);

    expect(monitor.read()?.maxMs).toBeGreaterThanOrEqual(150);
  });

  it('reports a window that starts at the previous rotation', async () => {
    let clock = 0;
    monitor = createEventLoopMonitor({ now: () => clock });
    await untilSampled(monitor);

    clock = 30_000;
    vi.advanceTimersByTime(30_000);
    clock = 45_000;
    expect(monitor.read()?.windowMs).toBe(45_000);

    clock = 60_000;
    vi.advanceTimersByTime(30_000);
    await untilSampled(monitor);
    clock = 70_000;
    expect(monitor.read()?.windowMs).toBe(40_000);
  });

  it('forgets delays older than two rotations', async () => {
    const rotateEveryMs = 10_000;
    monitor = createEventLoopMonitor({ rotateEveryMs });
    await untilSampled(monitor);

    blockFor(200);
    await sleep(30);
    expect(monitor.read()?.maxMs).toBeGreaterThanOrEqual(150);

    // one rotation later the block is still inside the window
    vi.advanceTimersByTime(rotateEveryMs);
    expect(monitor.read()?.maxMs).toBeGreaterThanOrEqual(150);

    // two rotations later it has been dropped
    vi.advanceTimersByTime(rotateEveryMs);
    await untilSampled(monitor);
    expect(monitor.read()?.maxMs).toBeLessThan(150);
  });

  it('stops sampling after stop', async () => {
    monitor = createEventLoopMonitor({ now: () => 0 });
    await untilSampled(monitor);
    expect(vi.getTimerCount()).toBe(1);

    monitor.stop();
    const before = monitor.read();
    expect(vi.getTimerCount()).toBe(0);

    blockFor(200);
    await sleep(30);

    expect(before).toBeDefined();
    expect(monitor.read()).toEqual(before);
  });
});
