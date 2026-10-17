import type { Context } from 'koa';
import { getService } from '../utils';
import {
  validateMfaImpactQuery,
  validateUpdateSecuritySettings,
} from '../validation/security-settings';
import type {
  GetMfaImpact,
  GetSecuritySettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';

export default {
  async get(ctx: Context) {
    ctx.body = {
      data: await getService('security-settings').getSettings(),
    } satisfies GetSecuritySettings.Response;
  },

  async mfaImpact(ctx: Context) {
    // `qs` gives a single-element array as a bare string; the schema wants one shape.
    const { mode, requiredRoles } = ctx.query as Record<string, unknown>;
    const query = {
      mode,
      ...(requiredRoles !== undefined
        ? { requiredRoles: ([] as unknown[]).concat(requiredRoles) }
        : {}),
    };
    await validateMfaImpactQuery(query);
    const { mode: proposedMode, requiredRoles: roles = [] } =
      query as GetMfaImpact.Request['query'];

    ctx.body = {
      data: await getService('mfa').enforcementImpact({ mode: proposedMode, requiredRoles: roles }),
    } satisfies GetMfaImpact.Response;
  },

  async update(ctx: Context) {
    await validateUpdateSecuritySettings(ctx.request.body ?? {});
    const body = ctx.request.body as UpdateSecuritySettings.Request['body'];

    ctx.body = {
      data: await getService('security-settings').updateSettings(
        { ...body, code: body.code?.trim() },
        ctx.state.user
      ),
    } satisfies UpdateSecuritySettings.Response;
  },
};
