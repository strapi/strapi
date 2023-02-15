'use strict';

const { take, drop } = require('lodash/fp');
const { getService } = require('../../../server/utils');

const enableUsersToLicenseLimit = async (numberOfUsersToEnable) => {
  const data = await getService('user').getDisabledUserList();

  if (!data || !data.value || data.value.length === 0) return;

  const disabledUsers = JSON.parse(data.value);

  const usersToEnable = take(disabledUsers, numberOfUsersToEnable);

  for await (const user of usersToEnable) {
    try {
      await strapi.db.query('admin::user').update({
        where: { id: user.id },
        data: { isActive: true },
      });
    } catch (error) {
      return;
    }
  }

  const remainingDisabledUsers = drop(disabledUsers, numberOfUsersToEnable);

  await strapi.db.query('strapi::ee-store').update({
    where: { id: data.id },
    data: { value: JSON.stringify(remainingDisabledUsers) },
  });
};

const calculateAdminSeatDifference = async (seatsAllowedByLicense) => {
  const currentAdminSeats = await getService('user').getCurrentActiveUserCount();
  return currentAdminSeats - seatsAllowedByLicense;
};

const disableUsersAboveLicenseLimit = async (numberOfUsersToDisable) => {
  const users = await strapi.db.query('admin::user').findMany({
    where: { isActive: 'true' },
    orderBy: { createdAt: 'DESC' },
    populate: { roles: { select: ['id'] } },
  });

  const usersToDisable = take(users, numberOfUsersToDisable);

  for await (const user of usersToDisable) {
    try {
      await strapi.db.query('admin::user').update({
        where: { id: user.id },
        data: {
          isActive: false,
        },
      });
      user.isActive = false;
    } catch (error) {
      return;
    }
  }

  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (data) {
    return strapi.db.query('strapi::ee-store').update({
      where: { id: data.id },
      data: { value: JSON.stringify(usersToDisable) },
    });
  }

  await strapi.db.query('strapi::ee-store').create({
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

    await strapi.db.query('admin::user').update({
      where: { id: user.id },
      data: { isActive: false },
    });
  });
};

const revertSeatEnforcementWorkflow = async () => {
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
    if (data.isActive !== user.isActive) return;

    await strapi.db.query('admin::user').update({
      where: { id: user.id },
      data: { isActive: true },
    });
  });
};

const seatEnforcementWorkflow = async () => {
  const permittedAdminSeats = strapi.ee.licenseInfo.seats;
  if (!permittedAdminSeats) return;

  await syncdDisabledUserRecords();
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
};

module.exports = {
  seatEnforcementWorkflow,
  revertSeatEnforcementWorkflow,
};
