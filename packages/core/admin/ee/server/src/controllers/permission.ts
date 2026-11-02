import type { Context } from 'koa';

import cePermissionController from '../../../../server/src/controllers/permission';
import actions from '../config/admin-actions';
import { isAuditLogsEnabled } from '../audit-logs/utils';

import type { GetAll } from '../../../../shared/contracts/permissions';

const AUDIT_LOGS_ACTION_IDS = actions.auditLogs.map(({ uid }) => `admin::${uid}`);

/**
 * The license includes audit logs but `admin.auditLogs.enabled` turns them off.
 * The permission actions stay registered so role and admin-token grants are kept.
 */
const isAuditLogsDisabledByConfig = (): boolean =>
  strapi.ee.features.isEnabled('audit-logs') === true && isAuditLogsEnabled(strapi) === false;

export default {
  /**
   * Same as the CE handler, and flags the audit-log settings actions as disabled by config.
   * The editors keep showing them: hiding them would delete their grants on the next save,
   * because a role or admin-token update replaces the full permission set.
   */
  async getAll(ctx: Context) {
    await cePermissionController.getAll(ctx);

    if (isAuditLogsDisabledByConfig() === false) {
      return;
    }

    const { sections } = (ctx.body as GetAll.Response).data;

    sections.settings = sections.settings.map((permission) =>
      AUDIT_LOGS_ACTION_IDS.includes(permission.action)
        ? { ...permission, disabledByConfig: true }
        : permission
    );
  },
};
