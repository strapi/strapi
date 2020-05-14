'use strict';

const _ = require('lodash');
const { validateUserCreationInput } = require('../validation/user');

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;

    try {
      await validateUserCreationInput(body);
    } catch (err) {
      return ctx.badRequest(err);
    }

    const attributes = _.pick(body, ['firstname', 'lastname', 'email', 'roles']);

    const userAlreadyExists = await strapi.admin.services.user.exists({
      email: attributes.email,
    });

    if (userAlreadyExists) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.email.taken',
          message: 'Email already taken',
          field: ['email'],
        })
      );
    }

    const createdUser = await strapi.admin.services.user.create({
      ...attributes,
      registrationToken: strapi.admin.services.token.createToken(),
    });

    // Send 201 created
    ctx.created(strapi.admin.services.user.sanitizeUser(createdUser));
  },
};
