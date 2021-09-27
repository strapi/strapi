'use strict';

const _ = require('lodash');
const {
  validateUserCreationInput,
  validateUserUpdateInput,
  validateUsersDeleteInput,
} = require('../validation/user');

const { getService } = require('../utils');

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;

    try {
      await validateUserCreationInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const attributes = _.pick(body, [
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
      return ctx.badRequest('Email already taken');
    }

    const createdUser = await getService('user').create(attributes);

    const userInfo = getService('user').sanitizeUser(createdUser);

    // Send 201 created
    ctx.created({ data: userInfo });
  },

  async find(ctx) {
    const userService = getService('user');

    const { results, pagination } = await userService.findPage(ctx.query);

    ctx.body = {
      data: {
        results: results.map(user => userService.sanitizeUser(user)),
        pagination,
      },
    };
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    const user = await getService('user').findOne(id);

    if (!user) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(user),
    };
  },

  async update(ctx) {
    const { id } = ctx.params;
    const { body: input } = ctx.request;

    try {
      await validateUserUpdateInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    if (_.has(input, 'email')) {
      const uniqueEmailCheck = await getService('user').exists({
        id: { $ne: id },
        email: input.email,
      });

      if (uniqueEmailCheck) {
        return ctx.badRequest('A user with this email address already exists');
      }
    }

    const updatedUser = await getService('user').updateById(id, input);

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(updatedUser),
    };
  },

  async deleteOne(ctx) {
    const { id } = ctx.params;

    const deletedUser = await getService('user').deleteById(id);

    if (!deletedUser) {
      return ctx.notFound('User not found');
    }

    return ctx.deleted({
      data: getService('user').sanitizeUser(deletedUser),
    });
  },

  /**
   * Delete several users
   * @param {KoaContext} ctx - koa context
   */
  async deleteMany(ctx) {
    const { body } = ctx.request;
    try {
      await validateUsersDeleteInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const users = await getService('user').deleteByIds(body.ids);

    const sanitizedUsers = users.map(getService('user').sanitizeUser);

    return ctx.deleted({
      data: sanitizedUsers,
    });
  },
};
