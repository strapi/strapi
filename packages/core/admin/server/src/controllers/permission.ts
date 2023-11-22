import type { Context } from 'koa';
import { validateCheckPermissionsInput } from '../validation/permission';
import { getService } from '../utils';
import { formatConditions } from './formatters';
import type { Action } from '../domain/action';
import type { GetAll, Check } from '../../../shared/contracts/permissions';
import { Condition } from '../domain/condition';
import { Permission } from '../../../shared/contracts/shared';

export default {
  /**
   * Check each permissions from `request.body.permissions` and returns an array of booleans
   * @param {KoaContext} ctx - koa context
   */
  async check(ctx: Context) {
    const { body: input } = ctx.request as Check.Request;
    const { userAbility } = ctx.state;

    await validateCheckPermissionsInput(input);

    const { engine } = getService('permission');

    const checkPermissionsFn = engine.checkMany(userAbility);

    ctx.body = {
      data: checkPermissionsFn(input.permissions as Permission[]),
    } satisfies Check.Response;
  },

  /**
   * Returns every permissions, in nested format
   * @param {KoaContext} ctx - koa context
   */
  async getAll(ctx: Context) {
    const { sectionsBuilder, actionProvider, conditionProvider } = getService('permission');

    const actions = actionProvider.values() as Action[];
    const conditions = conditionProvider.values() as Condition[];
    const sections = await sectionsBuilder.build(actions);

    ctx.body = {
      data: {
        // @ts-expect-error - refactor to use a proper type
        conditions: formatConditions(conditions),
        sections,
      },
    } satisfies GetAll.Response;
  },
};
