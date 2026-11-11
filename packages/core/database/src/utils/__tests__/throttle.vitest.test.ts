import { performance } from 'node:perf_hooks';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createThrottle } from '../throttle';

describe('createThrottle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lets the first call through', () => {
    const throttle = createThrottle({ intervalMs: 30_000, now: () => 0 });

    expect(throttle.take()).toEqual({ emit: true, suppressed: 0 });
  });

  it('holds back calls inside the interval and counts them', () => {
    let clock = 0;
    const throttle = createThrottle({ intervalMs: 30_000, now: () => clock });
    throttle.take();

    clock = 10_000;
    expect(throttle.take()).toEqual({ emit: false, suppressed: 1 });
    clock = 29_999;
    expect(throttle.take()).toEqual({ emit: false, suppressed: 2 });
  });

  it('emits again once the interval has passed and reports what it held back', () => {
    let clock = 0;
    const throttle = createThrottle({ intervalMs: 30_000, now: () => clock });
    throttle.take();
    clock = 1;
    throttle.take();
    throttle.take();

    clock = 30_000;
    expect(throttle.take()).toEqual({ emit: true, suppressed: 2 });
    clock = 30_001;
    expect(throttle.take()).toEqual({ emit: false, suppressed: 1 });
  });

  it('measures the default interval on a monotonic clock, so a wall clock step does not silence it', () => {
    const wall = vi.spyOn(Date, 'now');
    const monotonic = vi.spyOn(performance, 'now');
    wall.mockReturnValue(2_000_000_000_000);
    monotonic.mockReturnValue(1_000);
    const throttle = createThrottle({ intervalMs: 30_000 });
    throttle.take();

    // The wall clock steps back an hour (NTP, VM resume) while a full interval passes.
    wall.mockReturnValue(2_000_000_000_000 - 3_600_000);
    monotonic.mockReturnValue(31_000);

    expect(throttle.take()).toEqual({ emit: true, suppressed: 0 });
  });
});
