import { describe, expect, it } from 'vitest';

import { isNativeUsername } from '../native-username';

describe('isNativeUsername', () => {
  it('accepts what the native sign-in accepts and refuses jo and john-doe', () => {
    expect(isNativeUsername('joe')).toBe(true);
    expect(isNativeUsername('John_Doe.99')).toBe(true);
    expect(isNativeUsername('a'.repeat(30))).toBe(true);

    expect(isNativeUsername('jo')).toBe(false);
    expect(isNativeUsername('john-doe')).toBe(false);
    expect(isNativeUsername('a'.repeat(31))).toBe(false);
    expect(isNativeUsername('jane@work')).toBe(false);
    expect(isNativeUsername('jöhn')).toBe(false);
    expect(isNativeUsername('')).toBe(false);
  });
});
