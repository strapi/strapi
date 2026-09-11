/* eslint-env jest */

import isMfaEnabled from '../isMfaEnabled';

type PolicyHandler = (ctx: unknown, config: unknown, deps: { strapi: unknown }) => void;

const handler = (isMfaEnabled as unknown as { handler: PolicyHandler }).handler;

const strapiWith = (enabled: boolean) => ({
  service: jest.fn(() => ({ isEnabled: () => enabled })),
});

/**
 * The one gate for every admin two-factor route. It replaced a guard repeated at the top of 21
 * handlers, a Koa middleware duplicating it on the login routes, and a cross-controller import
 * for the settings ones.
 */
describe('admin::isMfaEnabled', () => {
  const run = (enabled: boolean) => handler({}, {}, { strapi: strapiWith(enabled) });

  test('lets the request through while the feature is on', () => {
    expect(() => run(true)).not.toThrow();
  });

  // A 404, not the 403 a policy returning `false` would produce: a disabled feature must look
  // absent, and 403 tells the caller the endpoint exists and they merely lack permission.
  test('throws NotFoundError while the feature is off', () => {
    expect(() => run(false)).toThrow(expect.objectContaining({ name: 'NotFoundError' }));
  });

  test('reads the flag per request rather than caching it', () => {
    const strapi = { service: jest.fn(() => ({ isEnabled: () => false })) };

    expect(() => handler({}, {}, { strapi })).toThrow();
    expect(() => handler({}, {}, { strapi })).toThrow();

    // Asked the registry again on the second call: toggling the config must take effect without
    // a route rebuild.
    expect(strapi.service).toHaveBeenCalledTimes(2);
  });
});
