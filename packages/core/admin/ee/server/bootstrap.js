'use strict';

const _ = require('lodash');
// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCEBootstrap = require('../../server/bootstrap');
const { getService } = require('../../server/utils');
const actions = require('./config/admin-actions');

const enableUsersToLicenseLimit = async (numberOfUsersToEnable) => {
  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (!data || !data.value || data.value.length === 0) return;

  const disabledUsers = JSON.parse(data.value);

  const usersToEnable = _.take(disabledUsers, numberOfUsersToEnable);

  usersToEnable.forEach(async (user) => {
    const data = await strapi.db.query('admin::user').findOne({
      where: { id: user.id },
    });

    if (!data) return;

    await strapi.db.query('admin::user').update({
      where: { id: user.id },
      data: { isActive: true },
    });
  });

  const remainingDisabledUsers = _.drop(disabledUsers, numberOfUsersToEnable);

  return strapi.db.query('strapi::ee-store').update({
    where: { id: data.id },
    data: { value: JSON.stringify(remainingDisabledUsers) },
  });
};

const calculateAdminSeatDifference = async (seatsAllowedByLicense) => {
  const currentAdminSeats = await strapi.db.query('admin::user').count({
    where: {
      isActive: true,
    },
  });
  return currentAdminSeats - seatsAllowedByLicense;
};

const disableUsersAboveLicenseLimit = async (numberOfUsersToDisable) => {
  const users = await strapi.db.query('admin::user').findMany({
    where: { isActive: 'true' },
    orderBy: { createdAt: 'DESC' },
    populate: { roles: { select: ['id'] } },
  });

  const usersToDisable = _.take(users, numberOfUsersToDisable);

  usersToDisable.forEach(async (user) => {
    user.isActive = false;
    await strapi.db.query('admin::user').update({
      where: { id: user.id },
      data: {
        isActive: false,
      },
    });
  });

  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (data) {
    return strapi.db.query('strapi::ee-store').update({
      where: { id: data.id },
      data: { value: JSON.stringify(usersToDisable) },
    });
  }

  return strapi.db.query('strapi::ee-store').create({
    data: {
      key: 'ee_disabled_users',
      value: JSON.stringify(usersToDisable),
    },
  });
};

const syncdDisabledUserRecords = async () => {
  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (!data || !data.value || data.value.length === 0) return;

  const disabledUsers = JSON.parse(data.value);
  disabledUsers.forEach(async (user) => {
    const data = await strapi.db.query('admin::user').findOne({
      where: { id: user.id },
    });

    if (!data) return;

    return strapi.db.query('admin::user').update({
      where: { id: user.id },
      data: { isActive: user.isActive }, // TODO: should this value be hardcoded to 'false' or no?
    });
  });
};

module.exports = async () => {
  const { actionProvider } = getService('permission');

  if (features.isEnabled('sso')) {
    await actionProvider.registerMany(actions.sso);
  }

  if (features.isEnabled('audit-logs')) {
    await actionProvider.registerMany(actions.auditLogs);
  }

  // TODO: check admin seats
  await syncdDisabledUserRecords();

  const permittedAdminSeats = 5;

  const adminSeatDifference = await calculateAdminSeatDifference(permittedAdminSeats);

  switch (true) {
    case adminSeatDifference === 0:
      break;
    case adminSeatDifference > 0:
      await disableUsersAboveLicenseLimit(adminSeatDifference);
      break;
    case adminSeatDifference < 0:
      await enableUsersToLicenseLimit(Math.abs(adminSeatDifference));
      break;
    default:
      break;
  }
  await executeCEBootstrap();
};
