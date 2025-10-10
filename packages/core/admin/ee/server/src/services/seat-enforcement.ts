import { take, drop, map, prop, pick, reverse, isNil } from 'lodash/fp';
import { getService } from '../utils';
import constants from '../../../../server/src/services/constants';

const { SUPER_ADMIN_CODE } = constants;

/**
 * Keeps the list of users disabled by the seat enforcement service
 */
const getDisabledUserList = async () => {
  return strapi.store.get({ type: 'ee', key: 'disabled_users' });
};

const enableMaximumUserCount = async (numberOfUsersToEnable: number) => {
  const disabledUsers = (await getDisabledUserList()) as any;
  const orderedDisabledUsers = reverse(disabledUsers);

  const usersToEnable = take(numberOfUsersToEnable, orderedDisabledUsers);

  await strapi.db.query('admin::user').updateMany({
    where: { id: map(prop('id'), usersToEnable) },
    data: { isActive: true },
  });

  const remainingDisabledUsers = drop(numberOfUsersToEnable, orderedDisabledUsers);

  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: remainingDisabledUsers,
  });
};

const disableUsersAboveLicenseLimit = async (numberOfUsersToDisable: number) => {
  const currentlyDisabledUsers: any = (await getDisabledUserList()) ?? [];

  const usersToDisable = [];
  const nonSuperAdminUsersToDisable = await strapi.db.query('admin::user').findMany({
    where: {
      isActive: true,
      roles: {
        code: { $ne: SUPER_ADMIN_CODE },
      },
    },
    orderBy: { createdAt: 'DESC' },
    limit: numberOfUsersToDisable,
  });

  usersToDisable.push(...nonSuperAdminUsersToDisable);

  if (nonSuperAdminUsersToDisable.length < numberOfUsersToDisable) {
    const superAdminUsersToDisable = await strapi.db.query('admin::user').findMany({
      where: {
        isActive: true,
        roles: { code: SUPER_ADMIN_CODE },
      },
      orderBy: { createdAt: 'DESC' },
      limit: numberOfUsersToDisable - nonSuperAdminUsersToDisable.length,
    });

    usersToDisable.push(...superAdminUsersToDisable);
  }

  await strapi.db.query('admin::user').updateMany({
    where: { id: map(prop('id'), usersToDisable) },
    data: { isActive: false },
  });

  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: currentlyDisabledUsers.concat(map(pick(['id', 'isActive']), usersToDisable)),
  });
};

const syncDisabledUserRecords = async () => {
  const disabledUsers = await strapi.store.get({ type: 'ee', key: 'disabled_users' });

  if (!disabledUsers) {
    return;
  }

  await strapi.db.query('admin::user').updateMany({
    where: { id: map(prop('id'), disabledUsers) },
    data: { isActive: false },
  });
};

const seatEnforcementWorkflow = async () => {
  const adminSeats = strapi.ee.seats;
  if (isNil(adminSeats)) {
    return;
  }

  // TODO: we need to make sure an admin can decide to disable specific user and reactivate others
  await syncDisabledUserRecords();

  const currentActiveUserCount = await getService('user').getCurrentActiveUserCount();

  const adminSeatsLeft = adminSeats - currentActiveUserCount;

  if (adminSeatsLeft > 0) {
    await enableMaximumUserCount(adminSeatsLeft);
  } else if (adminSeatsLeft < 0) {
    await disableUsersAboveLicenseLimit(-adminSeatsLeft);
  }
};

export default {
  seatEnforcementWorkflow,
  getDisabledUserList,
};
