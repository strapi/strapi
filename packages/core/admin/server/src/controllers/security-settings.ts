import type { Context } from 'koa';
import { getService } from '../utils';
import { validateUpdateSecuritySettings } from '../validation/security-settings';
import type {
  GetSecuritySettings,
  UpdateSecuritySettings,
} from '../../../shared/contracts/security-settings';

export default {
  async get(ctx: Context) {
    ctx.body = {
      data: await getService('security-settings').getSettings(),
    } satisfies GetSecuritySettings.Response;
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
