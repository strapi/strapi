'use strict';

const _ = require('lodash');
const { validateUserCreationInput } = require('../validation/user');

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

    return {
      data: {
        results: results.map(strapi.admin.services.user.sanitizeUser),
        pagination,
      },
    };
  },
};
