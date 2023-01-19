'use strict';

const { get } = require('lodash');
const { pick } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;
const { validateUserCreationInput } = require('../validation/user');
const { getService } = require('../../../server/utils');

const pickUserCreationAttributes = pick(['firstname', 'lastname', 'email', 'roles']);

module.exports = {
  async create(ctx) {
    const { body } = ctx.request;
    const cleanData = { ...body, email: get(body, `email`, ``).toLowerCase() };

    await validateUserCreationInput(cleanData);

    const attributes = pickUserCreationAttributes(cleanData);
    const { useSSORegistration } = cleanData;

    const userAlreadyExists = await getService('user').exists({ email: attributes.email });

    if (userAlreadyExists) {
      throw new ApplicationError('Email already taken');
    }

    if (useSSORegistration) {
      Object.assign(attributes, { registrationToken: null, isActive: true });
    }

    const createdUser = await getService('user').create(attributes);
    const userInfo = getService('user').sanitizeUser(createdUser);

    // Note: We need to assign manually the registrationToken to the
    // final user payload so that it's not removed in the sanitation process.
    Object.assign(userInfo, { registrationToken: createdUser.registrationToken });

    ctx.created({ data: userInfo });
  },
};
