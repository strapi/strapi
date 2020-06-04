'use strict';

const _ = require('lodash');
const { validateUserCreationInput, validateUserUpdateInput } = require('../validation/user');

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;

    try {
      await validateUserCreationInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const attributes = _.pick(body, ['firstname', 'lastname', 'email', 'roles']);

    const userAlreadyExists = await strapi.admin.services.user.exists({
      email: attributes.email,
    });

    if (userAlreadyExists) {
      return ctx.badRequest('Email already taken');
    }

    const createdUser = await strapi.admin.services.user.create(attributes);

    const userInfo = strapi.admin.services.user.sanitizeUser(createdUser);

    // Send 201 created
    ctx.created({ data: userInfo });
  },

  async find(ctx) {
    const method = _.has(ctx.query, '_q') ? 'searchPage' : 'findPage';

    const { results, pagination } = await strapi.admin.services.user[method](ctx.query);

    ctx.body = {
      data: {
        results: results.map(strapi.admin.services.user.sanitizeUser),
        pagination,
      },
    };
  },

  async findOne(ctx) {
    const { id } = ctx.params;

    const user = await strapi.admin.services.user.findOne({ id });

    if (!user) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: strapi.admin.services.user.sanitizeUser(user),
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

    const updatedUser = await strapi.admin.services.user.update({ id }, input);

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: strapi.admin.services.user.sanitizeUser(updatedUser),
    };
  },

  async delete(ctx) {
    const { id } = ctx.params;

    if (!id) {
      return ctx.badRequest('Invalid ID');
    }

    const deletedUser = await strapi.admin.services.user.deleteOne({ id });

    if (!deletedUser) {
      return ctx.notFound('User not found');
    }

    return ctx.deleted({
      data: strapi.admin.services.user.sanitizeUser(deletedUser),
    });
  },
};
