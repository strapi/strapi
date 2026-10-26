import type { Context } from 'koa';

import { get, has, pick } from 'lodash';
import { errors } from '@strapi/utils';
import {
  validateUserCreationInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,
} from '../validation/user';
import { getService } from '../utils';
import { normalizeEmail } from '../utils/normalize-email';
import {
  Create,
  DeleteMany,
  DeleteOne,
  FindAll,
  FindOne,
  Update,
  type AdminUserMfaState,
} from '../../../shared/contracts/user';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError } = errors;

/**
 * Enforcement state is for the people who can act on it (unlock, reset). Gated on the feature
 * being enabled too, not just the ability: with the flag off the user endpoints must read exactly
 * as they did on develop, for every caller.
 */
const canSeeMfaState = (ctx: Context): boolean =>
  getService('mfa').isEnabled() && Boolean(ctx.state.userAbility?.can('admin::users.update'));

/**
 * Appended after sanitising, as a fresh object rather than a mutation of the sanitizer's return,
 * like `registrationToken` in `create`, so the shared sanitizer keeps these out of every other
 * user-bearing response. Never the secrets: `mfaSecret` and `mfaPendingSecret` stay out.
 */
const withMfaState = <T extends object>(
  sanitized: T,
  user: AdminUser,
  include: boolean
): T & AdminUserMfaState =>
  include
    ? {
        ...sanitized,
        mfaEnabledAt: user.mfaEnabledAt ?? null,
        mfaGraceUntil: user.mfaGraceUntil ?? null,
        mfaLockedAt: user.mfaLockedAt ?? null,
      }
    : sanitized;

export default {
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const cleanData = { ...body, email: get(body, `email`, ``).toLowerCase() };

    await validateUserCreationInput(cleanData);

    const attributes = pick(cleanData, [
      'firstname',
      'lastname',
      'email',
      'roles',
      'preferedLanguage',
    ]);

    const userAlreadyExists = await getService('user').exists({
      email: attributes.email,
    });

    if (userAlreadyExists) {
      throw new ApplicationError('Email already taken');
    }

    const createdUser = await getService('user').create(attributes);

    const userInfo = getService('user').sanitizeUser(createdUser);

    // Note: We need to assign manually the registrationToken to the
    // final user payload so that it's not removed in the sanitation process.
    Object.assign(userInfo, { registrationToken: createdUser.registrationToken });

    // Send 201 created
    ctx.created({ data: userInfo } satisfies Create.Response);
  },

  async find(ctx: Context) {
    const userService = getService('user');

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: 'admin::user',
    });

    await permissionsManager.validateQuery(ctx.query);
    const sanitizedQuery = await permissionsManager.sanitizeQuery(ctx.query);

    // @ts-expect-error update the service type
    const { results, pagination } = await userService.findPage(sanitizedQuery);

    const includeMfa = canSeeMfaState(ctx);

    ctx.body = {
      data: {
        // Enforcement state per row, so an administrator watching grace periods run out can see
        // every account on one page instead of opening each user in turn.
        results: results.map((user: AdminUser) =>
          withMfaState(userService.sanitizeUser(user), user, includeMfa)
        ),
        pagination,
      },
    } satisfies FindAll.Response;
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params as FindOne.Params;

    const user = await getService('user').findOne(id);

    if (!user) {
      return ctx.notFound('User does not exist');
    }

    const sanitized = getService('user').sanitizeUser(user as AdminUser);
    const data: FindOne.Response['data'] = withMfaState(
      sanitized,
      user as AdminUser,
      canSeeMfaState(ctx)
    );

    ctx.body = { data } satisfies FindOne.Response;
  },

  async update(ctx: Context) {
    const { id } = ctx.params as Update.Params;
    const data = normalizeEmail((ctx.request as Update.Request).body);

    await validateUserUpdateInput(data);

    if (has(data, 'email')) {
      const uniqueEmailCheck = await getService('user').exists({
        id: { $ne: id },
        email: data.email,
      });

      if (uniqueEmailCheck) {
        throw new ApplicationError('A user with this email address already exists');
      }
    }

    const updatedUser = await getService('user').updateById(id, data);

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(updatedUser),
    } satisfies Update.Response;
  },

  async deleteOne(ctx: Context) {
    const { id } = ctx.params as DeleteOne.Params;
    const user = ctx.state.user as AdminUser | undefined;

    if (user && user.id === id) {
      throw new ApplicationError('You cannot delete your own user');
    }

    const deletedUser = await getService('user').deleteById(id);

    if (!deletedUser) {
      return ctx.notFound('User not found');
    }

    return ctx.deleted({
      data: getService('user').sanitizeUser(deletedUser),
    } satisfies DeleteOne.Response);
  },

  /**
   * Delete several users
   * @param ctx - koa context
   */
  async deleteMany(ctx: Context) {
    const { body } = ctx.request as DeleteMany.Request;
    const user = ctx.state.user as AdminUser | undefined;
    await validateUsersDeleteInput(body);
    const idsSet = new Set(body.ids);

    // Prevent self-deletion
    if (user && idsSet.has(user.id)) {
      throw new ApplicationError('You cannot delete your own user');
    }
    const users = await getService('user').deleteByIds(body.ids);

    const sanitizedUsers = users.map(getService('user').sanitizeUser);

    return ctx.deleted({
      data: sanitizedUsers,
    } satisfies DeleteMany.Response);
  },
};
