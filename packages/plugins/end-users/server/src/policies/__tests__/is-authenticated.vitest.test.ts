import { describe, expect, it } from 'vitest';

import policies from '../index';
import { isAuthenticated } from '../is-authenticated';
import { NOT_SIGNED_IN, endUser, refusal, requestOf, strapiWith } from './end-user-policies';

describe('plugin::end-users.is-authenticated', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['is-authenticated']).toBe(isAuthenticated);
    expect(isAuthenticated.name).toBe('plugin::end-users.is-authenticated');
  });

  it('passes a signed-in end user', () => {
    expect(isAuthenticated.handler(requestOf(endUser()), {}, strapiWith())).toBe(true);
  });

  it('passes a signed-in end user under the compatibility mode`s strategy name', () => {
    const request = requestOf(endUser(), 'users-permissions');

    expect(isAuthenticated.handler(request, {}, strapiWith({ compat: true }))).toBe(true);
  });

  it.each(Object.entries(NOT_SIGNED_IN))('refuses a caller with %s', (_caller, request) => {
    expect(() => isAuthenticated.handler(request, {}, strapiWith())).toThrow(
      refusal('AUTHENTICATION_REQUIRED')
    );
  });

  it('refuses credentials of the strategy that are not a user`s', () => {
    expect(() => isAuthenticated.handler(requestOf({ id: 1 }), {}, strapiWith())).toThrow(
      refusal('AUTHENTICATION_REQUIRED')
    );
  });

  it('says why, in words a front end can show', () => {
    expect(() => isAuthenticated.handler(NOT_SIGNED_IN.public, {}, strapiWith())).toThrow(
      'You need to sign in to do this.'
    );
  });
});
