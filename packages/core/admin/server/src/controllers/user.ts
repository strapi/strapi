import type { Context } from 'koa';

import * as _ from 'lodash';
import { errors } from '@strapi/utils';
import {
  validateUserCreationInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,
} from '../validation/user';
import { getService } from '../utils';
import {
  Create,
  DeleteMany,
  DeleteOne,
  FindAll,
  FindOne,
  Update,
} from '../../../shared/contracts/user';
import { AdminUser } from '../../../shared/contracts/shared';

const { ApplicationError } = errors;

export default {
  async create(ctx: Context) {
    const { body } = ctx.request as Create.Request;
    const cleanData = { ...body, email: _.get(body, `email`, ``).toLowerCase() };

    await validateUserCreationInput(cleanData);

    const attributes = _.pick(cleanData, [
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

    ctx.body = {
      data: {
        results: results.map((user: AdminUser) => userService.sanitizeUser(user)),
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

    ctx.body = {
      data: getService('user').sanitizeUser(user as AdminUser),
    } as FindOne.Response;
  },

  async update(ctx: Context) {
    const { id } = ctx.params as Update.Params;
    const { body: input } = ctx.request as Update.Request;

    await validateUserUpdateInput(input);

    if (_.has(input, 'email')) {
      const uniqueEmailCheck = await getService('user').exists({
        id: { $ne: id },
        email: input.email,
      });

      if (uniqueEmailCheck) {
        throw new ApplicationError('A user with this email address already exists');
      }
    }

    const updatedUser = await getService('user').updateById(id, input);

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(updatedUser),
    } satisfies Update.Response;
  },

  async deleteOne(ctx: Context) {
    const { id } = ctx.params as DeleteOne.Params;

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
    await validateUsersDeleteInput(body);

    const users = await getService('user').deleteByIds(body.ids);

    const sanitizedUsers = users.map(getService('user').sanitizeUser);

    return ctx.deleted({
      data: sanitizedUsers,
    } satisfies DeleteMany.Response);
  },
};
