'use strict';

const utils = require('@strapi/utils');
const { ApplicationError } = require('@strapi/utils/lib/errors');

const { PolicyError } = utils.errors;

module.exports = async (policyCtx, config = {}) => {
  if (!strapi.EE) {
    return true;
  }

  const permittedSeats = strapi.ee.licenseInfo.seats;
  if (!permittedSeats) return true;

  const userCount = await strapi.db.query('admin::user').count({
    where: { isActive: true },
  });

  if (userCount < permittedSeats) return true;
  if (userCount >= permittedSeats && config.isCreating) {
    throw new PolicyError("License seat limit reached, can't create new user", {
      policy: 'license-limit-allowance',
    });
  }

  const user = await strapi.db.query('admin::user').findOne({
    where: { id: policyCtx.params.id },
  });

  if (!user) {
    throw new ApplicationError('User could not be found');
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
