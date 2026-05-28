import services from '../index';

/**
 * Guards the backward-compatible `api-token` service key (same instance as
 * `api-token-content-api`) introduced after the admin/content token split so
 * `strapi.service('admin::api-token')` keeps working for plugins and scripts.
 * Remove this file in Strapi 6 once the `api-token` alias is dropped entirely.
 */
describe('Admin services — deprecated api-token alias', () => {
  test('exposes the same service instance as api-token-content-api (backward compatibility)', () => {
    expect(services['api-token']).toBeDefined();
    expect(services['api-token-content-api']).toBeDefined();
    expect(services['api-token']).toBe(services['api-token-content-api']);
  });
});
