/* eslint-env jest */

import isMfaEnabled from '../isMfaEnabled';

type PolicyHandler = (ctx: unknown, config: unknown, deps: { strapi: unknown }) => void;

const handler = (isMfaEnabled as unknown as { handler: PolicyHandler }).handler;

const strapiWith = (enabled: boolean) => ({
  service: jest.fn(() => ({ isEnabled: () => enabled })),
});

describe('admin::isMfaEnabled', () => {
  const run = (enabled: boolean) => handler({}, {}, { strapi: strapiWith(enabled) });

  test('lets the request through while the feature is on', () => {
    expect(() => run(true)).not.toThrow();
  });

  // A 404, not the 403 returning `false` gives: a disabled feature must look absent.
  test('throws NotFoundError while the feature is off', () => {
    expect(() => run(false)).toThrow(expect.objectContaining({ name: 'NotFoundError' }));
  });

  test('asks the mfa service on every request rather than deciding once at route build', () => {
    const strapi = { service: jest.fn(() => ({ isEnabled: () => false })) };

    expect(() => handler({}, {}, { strapi })).toThrow(
      expect.objectContaining({ name: 'NotFoundError' })
    );
    expect(() => handler({}, {}, { strapi })).toThrow(
      expect.objectContaining({ name: 'NotFoundError' })
    );

    // The policy does not memoise the answer. What `isEnabled()` itself caches -- the
    // `admin.auth.mfa` config, read once per process -- is pinned in the mfa service's own tests.
    expect(strapi.service).toHaveBeenCalledTimes(2);
  });
});
