'use strict';

const utils = require('@strapi/utils');

const { PolicyError } = utils.errors;

module.exports = async (policyCtx, config = {}) => {
  if (!strapi.EE) {
    return true;
  }

  const permittedSeats = strapi.ee.licenseInfo.seats;
  if (!permittedSeats) {
    return true;
  }

  const userCount = await strapi.service('admin::user').getCurrentActiveUserCount();

  if (userCount < permittedSeats) {
    return true;
  }

  if (userCount >= permittedSeats && config.isCreating) {
    throw new PolicyError("License seat limit reached, can't create new user", {
      policy: 'license-limit-allowance',
    });
  }

  const user = await strapi.service('admin::user').findOne(policyCtx.params.id);

  if (!user) {
    return true; // Delegate not found to the controller
  }

  if (
    userCount >= permittedSeats &&
    policyCtx.request.body.isActive === true &&
    user.isActive !== policyCtx.request.body.isActive
  ) {
    throw new PolicyError("License seat limit reached, can't reactivate user", {
      policy: 'license-limit-allowance',
    });
  }

  return true;
};
