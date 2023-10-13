import { validateCheckPermissionsInput } from '../validation/permission';
import { getService } from '../utils';
import { formatConditions } from './formatters';
import type { Action } from '../domain/action';

export default {
  /**
   * Check each permissions from `request.body.permissions` and returns an array of booleans
   * @param {KoaContext} ctx - koa context
   */
  async check(ctx: any) {
    const { body: input } = ctx.request;
    const { userAbility } = ctx.state;

    await validateCheckPermissionsInput(input);

    const { engine } = getService('permission');

    const checkPermissionsFn = engine.checkMany(userAbility);

    ctx.body = {
      data: checkPermissionsFn(input.permissions),
    };
  },

  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx: any) {
    const { sectionsBuilder, actionProvider, conditionProvider } = getService('permission');

    const actions = actionProvider.values() as Action[];
    const conditions = conditionProvider.values();
    const sections = await sectionsBuilder.build(actions);

    ctx.body = {
      data: {
        conditions: formatConditions(conditions),
        sections,
      },
    };
  },
};
