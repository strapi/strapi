import { describe, expect, it } from 'vitest';

import policies from '../index';
import { isVerified } from '../is-verified';
import { NOT_SIGNED_IN, endUser, refusal, requestOf, strapiWith } from './end-user-policies';

describe('plugin::end-users.is-verified', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['is-verified']).toBe(isVerified);
    expect(isVerified.name).toBe('plugin::end-users.is-verified');
  });

  it('passes a user who has verified their address', () => {
    expect(isVerified.handler(requestOf(endUser({ emailVerified: true })), {}, strapiWith())).toBe(
      true
    );
  });

  it('refuses a user who has not, with the strategy`s code', () => {
    const request = requestOf(endUser({ emailVerified: false }));

    expect(() => isVerified.handler(request, {}, strapiWith())).toThrow(
      refusal('EMAIL_NOT_VERIFIED')
    );
    expect(() => isVerified.handler(request, {}, strapiWith())).toThrow(
      'Verify your email address to do this.'
    );
  });

  it('refuses anything but true', () => {
    for (const emailVerified of [undefined, null, 'true', 1]) {
      const request = requestOf({ ...endUser(), emailVerified });

      expect(() => isVerified.handler(request, {}, strapiWith())).toThrow(
        refusal('EMAIL_NOT_VERIFIED')
      );
    }
  });

  it.each(Object.entries(NOT_SIGNED_IN))('refuses a caller with %s', (_caller, request) => {
    expect(() => isVerified.handler(request, {}, strapiWith())).toThrow(
      refusal('AUTHENTICATION_REQUIRED')
    );
  });
});
