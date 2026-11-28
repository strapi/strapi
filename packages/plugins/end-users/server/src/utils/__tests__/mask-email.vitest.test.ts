import { describe, expect, it } from 'vitest';

import { maskEmail } from '../mask-email';

describe('mask-email', () => {
  it('masks the new address', () => {
    expect(maskEmail('jane.doe@example.com')).toBe('j***@example.com');
  });

  it('keeps the one letter of a one-letter local part', () => {
    expect(maskEmail('j@example.com')).toBe('j***@example.com');
  });
});
