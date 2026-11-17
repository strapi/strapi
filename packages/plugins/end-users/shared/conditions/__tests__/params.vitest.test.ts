import { describe, expect, it } from 'vitest';

import { isParamNeeded } from '../params';

describe('isParamNeeded', () => {
  const relation = { type: 'attribute', relationTarget: 'plugin::end-users.end-user' };

  it('asks for a relation unless exactly one entry can be chosen', () => {
    expect([0, 1, 2].map((candidates) => isParamNeeded(relation, candidates))).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('asks for any other param only when it is required', () => {
    expect(isParamNeeded({ type: 'text', required: true }, 0)).toBe(true);
    expect(isParamNeeded({ type: 'text' }, 0)).toBe(false);
    expect(isParamNeeded({ type: 'attribute', required: true }, 1)).toBe(true);
  });
});
