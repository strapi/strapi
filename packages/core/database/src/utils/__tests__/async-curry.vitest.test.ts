import { describe, it, expect } from 'vitest';

import { asyncCurry } from '../async-curry';

describe('asyncCurry (database)', () => {
  const multiply = async (a: number, b: number) => a * b;

  it('curries async functions', async () => {
    const curried = asyncCurry(multiply);

    await expect(curried(2)(3)).resolves.toBe(6);
  });
});
