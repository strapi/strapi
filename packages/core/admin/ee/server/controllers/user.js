'use strict';

// eslint-disable-next-line node/no-extraneous-require
const ee = require('@strapi/strapi/lib/utils/ee');
const _ = require('lodash');
const { pick, isNil } = require('lodash/fp');
const { ApplicationError, ForbiddenError } = require('@strapi/utils').errors;
const { validateUserCreationInput } = require('../validation/user');
const { validateUserUpdateInput } = require('../../../server/validation/user');
const { getService } = require('../../../server/utils');
const { isSsoLocked } = require('../utils/sso-lock');

const pickUserCreationAttributes = pick(['firstname', 'lastname', 'email', 'roles']);

const hasAdminSeatsAvaialble = async () => {
  if (!strapi.EE) {
    return true;
  }

  const permittedSeats = ee.seats;
  if (isNil(permittedSeats)) {
    return true;
  }

  const userCount = await strapi.service('admin::user').getCurrentActiveUserCount();

  if (userCount < permittedSeats) {
    return true;
  }
};

module.exports = {
  async create(ctx) {
    if (!(await hasAdminSeatsAvaialble())) {
      throw new ForbiddenError('License seat limit reached. You cannot create a new user');
    }

    const { body } = ctx.request;
    const cleanData = { ...body, email: _.get(body, `email`, ``).toLowerCase() };

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

  async update(ctx) {
    const { id } = ctx.params;
    const { body: input } = ctx.request;

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

    const user = await getService('user').findOne(id, null);

    if (!(await hasAdminSeatsAvaialble()) && !user.isActive && input.isActive) {
      throw new ForbiddenError('License seat limit reached. You cannot active this user');
    }

    const updatedUser = await getService('user').updateById(id, input);

    if (!updatedUser) {
      return ctx.notFound('User does not exist');
    }

    ctx.body = {
      data: getService('user').sanitizeUser(updatedUser),
    };
  },

  async isSSOLocked(ctx) {
    const { user } = ctx.state;
    const isSSOLocked = await isSsoLocked(user);

    ctx.body = {
      data: {
        isSSOLocked,
      },
    };
  },
};
