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

  test('reads the flag per request rather than caching it', () => {
    const strapi = { service: jest.fn(() => ({ isEnabled: () => false })) };

    expect(() => handler({}, {}, { strapi })).toThrow();
    expect(() => handler({}, {}, { strapi })).toThrow();

    // Re-read per request, so toggling the config takes effect without a route rebuild.
    expect(strapi.service).toHaveBeenCalledTimes(2);
  });
});
