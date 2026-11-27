import { describe, expect, test } from 'vitest';

import { validateRouteConfig } from '../routing';

const route = (config: Record<string, unknown>) =>
  ({ method: 'GET', path: '/confirm', handler: 'auth.confirm', config }) as any;

describe('route config abortReadsOnRequestDisconnect validation', () => {
  test('keeps false, the value that opts the route out', () => {
    expect(
      validateRouteConfig(route({ abortReadsOnRequestDisconnect: false })).config
    ).toMatchObject({ abortReadsOnRequestDisconnect: false });
  });

  // Unknown keys were stripped before the flag existed: no value may make a route fail to load
  test.each([[true], ['false'], [1], [null]])('does not reject %j', (value) => {
    expect(() =>
      validateRouteConfig(route({ abortReadsOnRequestDisconnect: value }))
    ).not.toThrow();
  });
});
