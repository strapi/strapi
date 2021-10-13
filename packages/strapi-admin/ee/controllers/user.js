'use strict';

const { pick } = require('lodash/fp');
const { validateUserCreationInput } = require('../validation/user');

const pickUserCreationAttributes = pick(['firstname', 'lastname', 'email', 'roles']);

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;

    try {
      await validateUserCreationInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const attributes = pickUserCreationAttributes(body);
    const { useSSORegistration } = body;

    const userAlreadyExists = await strapi.admin.services.user.exists({ email: attributes.email });

    if (userAlreadyExists) {
      return ctx.badRequest('Email already taken');
    }

    if (useSSORegistration) {
      Object.assign(attributes, { registrationToken: null, isActive: true });
    }

    const createdUser = await strapi.admin.services.user.create(attributes);
    const userInfo = strapi.admin.services.user.sanitizeUser(createdUser);

    ctx.created({ data: userInfo });
  },
};
