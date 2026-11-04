import { describeOnCondition } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createAgent } from 'api-tests/agent';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

// Sorted, as `getRoleAuditLogActions` and `getTokenAuditLogActions` return them sorted
const AUDIT_LOG_ACTIONS = ['admin::audit-logs.export', 'admin::audit-logs.read'];

type PermissionLike = { action: string };

const pickAuditLogActions = (permissions: PermissionLike[]) =>
  permissions
    .map((permission) => permission.action)
    .filter((action) => AUDIT_LOG_ACTIONS.includes(action))
    .sort();

// The audit-log actions follow the license only: turning `admin.auditLogs.enabled` off must keep
// the audit-log grants of custom roles and admin tokens (e.g. a SIEM integration), so they work
// again once the config is turned back on.
describeOnCondition(edition === 'EE')(
  'Audit log permissions across admin.auditLogs.enabled',
  () => {
    let strapi: Core.Strapi | undefined;
    let rq: Awaited<ReturnType<typeof createAuthRequest>>;
    let customRoleId: number;
    let tokenId: number;
    let tokenAccessKey: string;

    const boot = async (auditLogsEnabled: boolean) => {
      strapi = await createStrapiInstance({
        register: async ({ strapi: instance }: { strapi: Core.Strapi }) => {
          instance.config.set('admin.auditLogs.enabled', auditLogsEnabled);
          instance.config.set('admin.secrets.encryptionKey', 'test-encryption-key');
        },
      });
      rq = await createAuthRequest({ strapi });
    };

    const reboot = async (auditLogsEnabled: boolean) => {
      await shutdown();
      await boot(auditLogsEnabled);
    };

    const shutdown = async () => {
      if (strapi !== undefined) {
        await strapi.destroy();
        strapi = undefined;
      }
    };

    const getRoleAuditLogActions = async (roleId: number) => {
      const res = await rq({ method: 'GET', url: `/admin/roles/${roleId}/permissions` });

      expect(res.statusCode).toBe(200);

      return pickAuditLogActions(res.body.data);
    };

    const getTokenAuditLogActions = async () => {
      const res = await rq({ method: 'GET', url: `/admin/admin-tokens/${tokenId}` });

      expect(res.statusCode).toBe(200);

      return pickAuditLogActions(res.body.data.adminPermissions);
    };

    const getAuditLogsWithToken = async () => {
      const tokenRq = createAgent(strapi!, { token: tokenAccessKey });

      return tokenRq({ method: 'GET', url: '/admin/audit-logs' });
    };

    const getSuperAdminRoleId = async () => {
      const superAdminRole = await strapi!.service('admin::role').getSuperAdmin();

      return superAdminRole.id as number;
    };

    const expectGrantsKept = async () => {
      expect(await getRoleAuditLogActions(customRoleId)).toEqual(AUDIT_LOG_ACTIONS);
      expect(await getTokenAuditLogActions()).toEqual(AUDIT_LOG_ACTIONS);
      expect(await getRoleAuditLogActions(await getSuperAdminRoleId())).toEqual(AUDIT_LOG_ACTIONS);
    };

    beforeAll(async () => {
      await boot(true);

      const roleRes = await rq({
        method: 'POST',
        url: '/admin/roles',
        body: { name: 'Audit log reader', description: 'Reads and exports audit logs' },
      });

      expect(roleRes.statusCode).toBe(201);
      customRoleId = roleRes.body.data.id;

      const assignRes = await rq({
        method: 'PUT',
        url: `/admin/roles/${customRoleId}/permissions`,
        body: {
          permissions: AUDIT_LOG_ACTIONS.map((action) => ({ action, subject: null })),
        },
      });

      expect(assignRes.statusCode).toBe(200);

      const tokenRes = await rq({
        method: 'POST',
        url: '/admin/admin-tokens',
        body: {
          name: 'audit-log-siem',
          adminPermissions: AUDIT_LOG_ACTIONS.map((action) => ({ action, subject: null })),
        },
      });

      expect(tokenRes.statusCode).toBe(201);
      tokenId = tokenRes.body.data.id;
      tokenAccessKey = tokenRes.body.data.accessKey;
    });

    afterAll(async () => {
      await reboot(true);
      await strapi!.db.query('admin::api-token').delete({ where: { id: tokenId } });
      await strapi!.service('admin::role').deleteByIds([customRoleId]);
      await shutdown();
    });

    test('a custom role and an admin token hold the audit-log grants while the config is on', async () => {
      await expectGrantsKept();
      expect((await getAuditLogsWithToken()).statusCode).toBe(200);
    });

    test('booting with the config off keeps the audit-log grants of every role and admin token', async () => {
      await reboot(false);

      // Only the grants are checked here: the routes are picked when the admin module loads, so
      // setting the config in `register` does not unmount them in this process
      await expectGrantsKept();
    });

    test('booting with the config back on lets the admin token read the audit logs again', async () => {
      await reboot(true);

      await expectGrantsKept();
      expect((await getAuditLogsWithToken()).statusCode).toBe(200);
    });
  }
);
