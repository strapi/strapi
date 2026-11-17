import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { waitForClaim } from '../pre-sync';

describe('waitForClaim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('takes a free claim at once', async () => {
    const claim = vi.fn().mockResolvedValue(true);

    await expect(waitForClaim({ claim, completed: async () => false })).resolves.toBe('claimed');
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('polls every 2 seconds and takes the claim when it is let go', async () => {
    const claim = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    const result = waitForClaim({ claim, completed: async () => false });

    await vi.advanceTimersByTimeAsync(1999);
    expect(claim).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(claim).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe('claimed');
  });

  it('goes on as completed when the other start finishes', async () => {
    const completed = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const result = waitForClaim({ claim: async () => false, completed });

    await vi.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe('completed');
  });

  it('gives up after the claim has had its 15 minutes', async () => {
    const claim = vi.fn().mockResolvedValue(false);
    const result = waitForClaim({ claim, completed: async () => false });

    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    await expect(result).resolves.toBe('timeout');
    expect(claim.mock.calls.length).toBeGreaterThan(400);
  });
});
