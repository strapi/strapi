'use strict';

const { pick } = require('lodash/fp');
const { validateUserCreationInput } = require('../validation/user');
const { getService } = require('../../../server/utils');

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

    const userAlreadyExists = await getService('user').exists({ email: attributes.email });

    if (userAlreadyExists) {
      return ctx.badRequest('Email already taken');
    }

    if (useSSORegistration) {
      Object.assign(attributes, { registrationToken: null, isActive: true });
    }

    const createdUser = await getService('user').create(attributes);
    const userInfo = getService('user').sanitizeUser(createdUser);

    ctx.created({ data: userInfo });
  },
};
