import { afterEach, describe, expect, it } from 'vitest';

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

  afterEach(() => {
    monitor?.stop();
    monitor = undefined;
  });

  it('reports nothing before the first sample', () => {
    monitor = createEventLoopMonitor();

    expect(monitor.read()).toBeUndefined();
  });

  it('sees a blocked event loop', async () => {
    monitor = createEventLoopMonitor();
    await sleep(100);
    setTimeout(() => blockFor(200), 0);
    await sleep(300);

    expect(monitor.read()?.maxMs).toBeGreaterThanOrEqual(150);
  });

  it('starts a new window after reset', async () => {
    let clock = 1_000;
    monitor = createEventLoopMonitor({ now: () => clock });
    await sleep(60);

    clock = 31_000;
    expect(monitor.read()?.windowMs).toBe(30_000);

    monitor.reset();
    clock = 32_000;
    await sleep(60);
    expect(monitor.read()?.windowMs).toBe(1_000);
  });

  it('forgets delays older than two rotations', async () => {
    monitor = createEventLoopMonitor({ rotateEveryMs: 100 });
    await sleep(50);
    setTimeout(() => blockFor(200), 0);
    await sleep(250);
    expect(monitor.read()?.maxMs).toBeGreaterThanOrEqual(150);

    await sleep(350);
    const later = monitor.read();
    expect(later?.maxMs).toBeLessThan(150);
    expect(later?.windowMs).toBeLessThanOrEqual(300);
  });

  it('stops sampling after stop', async () => {
    monitor = createEventLoopMonitor();
    await sleep(60);
    monitor.stop();
    setTimeout(() => blockFor(200), 0);
    await sleep(300);

    expect(monitor.read()?.maxMs ?? 0).toBeLessThan(150);
  });
});
