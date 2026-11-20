import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

/**
 * The Settings lists send plugin filters as `plugins[<pluginId>][$and]`, apart from the core
 * filters. Core routes must accept the param and leave it to the plugins.
 */
const PLUGIN_FILTERS = { plugins: { spaces: { $and: [{ space: { $eq: 'france' } }] } } };

describe('Settings lists with plugin filters (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test.each(['/admin/users', '/admin/roles', '/admin/api-tokens'])(
    '%s returns the same rows with or without plugin filters',
    async (url) => {
      const withoutFilters = await rq({ method: 'GET', url });
      const withFilters = await rq({ method: 'GET', url, qs: PLUGIN_FILTERS });

      expect(withFilters.statusCode).toBe(200);
      expect(withFilters.body).toEqual(withoutFilters.body);
    }
  );

  describeOnCondition(edition === 'EE')('audit logs', () => {
    test('the list returns the same rows with or without plugin filters', async () => {
      const withoutFilters = await rq({ method: 'GET', url: '/admin/audit-logs' });
      const withFilters = await rq({ method: 'GET', url: '/admin/audit-logs', qs: PLUGIN_FILTERS });

      expect(withFilters.statusCode).toBe(200);
      expect(withFilters.body).toEqual(withoutFilters.body);
    });

    test('the export accepts plugin filters', async () => {
      const res = await rq({ method: 'GET', url: '/admin/audit-logs/export', qs: PLUGIN_FILTERS });

      expect(res.statusCode).toBe(200);
    });
  });
});
