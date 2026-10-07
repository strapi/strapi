import { describe, expect, it } from 'vitest';

import { createThrottle } from '../throttle';

describe('createThrottle', () => {
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
});
