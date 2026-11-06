import { describeOnCondition } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// The admin hides the audit-logs settings link, page and homepage widget from the config state that
// `/admin/license-limit-information` reports, since the license alone does not tell it.
describeOnCondition(edition === 'EE')('Audit logs config state for the admin', () => {
  let strapi: Core.Strapi | undefined;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;

  const boot = async (auditLogsEnabled: boolean | undefined) => {
    strapi = await createStrapiInstance({
      register: async ({ strapi: instance }: { strapi: Core.Strapi }) => {
        if (auditLogsEnabled !== undefined) {
          instance.config.set('admin.auditLogs.enabled', auditLogsEnabled);
        }
      },
    });
    rq = await createAuthRequest({ strapi });
  };

  const shutdown = async () => {
    if (strapi !== undefined) {
      await strapi.destroy();
      strapi = undefined;
    }
  };

  const getAuditLogsState = async () => {
    const res = await rq({ method: 'GET', url: '/admin/license-limit-information' });

    expect(res.statusCode).toBe(200);

    return res.body.data.auditLogs;
  };

  afterEach(async () => {
    await shutdown();
  });

  test.each([
    { config: undefined, enabled: true },
    { config: true, enabled: true },
    { config: false, enabled: false },
  ])(
    'reports auditLogs.enabled $enabled when admin.auditLogs.enabled is $config',
    async ({ config, enabled }) => {
      await boot(config);

      expect(await getAuditLogsState()).toEqual({ enabled });
    }
  );
});
