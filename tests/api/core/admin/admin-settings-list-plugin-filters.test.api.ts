import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { describeOnCondition } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

/**
 * The Settings lists send the values of plugin dropdown filters as `plugins[<pluginId>][<name>]`.
 * The routes must accept it. The controller unit tests check that they drop it before querying.
 */
const PLUGIN_FILTERS = { plugins: { spaces: { space: 'france' } } };

describe('Settings list routes with a plugins param (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  test.each(['/admin/users', '/admin/roles'])(
    '%s accepts plugins and returns the same rows',
    async (url) => {
      const withoutFilters = await rq({ method: 'GET', url });
      const withFilters = await rq({ method: 'GET', url, qs: PLUGIN_FILTERS });

      expect(withFilters.statusCode).toBe(200);
      expect(withFilters.body).toEqual(withoutFilters.body);
    }
  );

  describeOnCondition(edition === 'EE')('audit logs', () => {
    test('the list accepts plugins and returns the same rows', async () => {
      const withoutFilters = await rq({ method: 'GET', url: '/admin/audit-logs' });
      const withFilters = await rq({ method: 'GET', url: '/admin/audit-logs', qs: PLUGIN_FILTERS });

      expect(withFilters.statusCode).toBe(200);
      expect(withFilters.body).toEqual(withoutFilters.body);
    });

    test('the export accepts plugins', async () => {
      const res = await rq({ method: 'GET', url: '/admin/audit-logs/export', qs: PLUGIN_FILTERS });

      expect(res.statusCode).toBe(200);
    });

    test('the export applies a plugin scope like the list', async () => {
      // The hidden row comes first: the export stops at the last row the scope keeps
      await strapi.db
        .query('admin::audit-log')
        .create({ data: { action: 'scope.hidden', date: new Date(), payload: {} } });
      await strapi.db
        .query('admin::audit-log')
        .create({ data: { action: 'scope.kept', date: new Date(), payload: {} } });

      // Like a scoping plugin: the scope reads the plugin value of the current request
      const unregister = strapi.db.unstable_scopes.register({
        where: ({ uid }) => {
          const query = strapi.requestContext.get()?.request.query as
            { plugins?: { demo?: { action?: unknown } } } | undefined;
          const action = query?.plugins?.demo?.action;

          return uid === 'admin::audit-log' && typeof action === 'string' ? { action } : null;
        },
      });

      try {
        const qs = { plugins: { demo: { action: 'scope.kept' } } };
        const list = await rq({ method: 'GET', url: '/admin/audit-logs', qs });
        // The export streams its rows after the request handler returned
        const exported = await rq({ method: 'GET', url: '/admin/audit-logs/export', qs });

        expect(list.body.results.map(({ action }: { action: string }) => action)).toEqual([
          'scope.kept',
        ]);
        expect(exported.statusCode).toBe(200);
        expect(exported.text).toContain('scope.kept');
        expect(exported.text).not.toContain('scope.hidden');
      } finally {
        unregister();
      }
    });
  });
});
