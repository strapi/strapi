'use strict';

const _ = require('lodash');

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const findNextMissingField = (obj, requiredFields) => {
  for (const field of requiredFields) {
    if (!obj[field]) {
      return field;
    }
  }
};

module.exports = {
  async create(ctx) {
    const requiredFields = ['firstname', 'lastname', 'email', 'roles'];
    const { body } = ctx.request;

    const missingField = findNextMissingField(body, requiredFields);

    if (missingField !== undefined) {
      return ctx.badRequest(
        null,
        formatError({
          id: `missing.${missingField}`,
          message: `Missing ${missingField}`,
          field: [missingField],
        })
      );
    }

    const requiredAttributes = _.pick(body, requiredFields);

    const userAlreadyExists = await strapi.admin.services.user.exists({
      email: requiredAttributes.email,
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
      ...requiredAttributes,
      registrationToken: strapi.admin.services.token.createToken(),
    });

    // Send 201 created
    ctx.created(strapi.admin.services.auth.sanitizeUser(createdUser));
  },
};
