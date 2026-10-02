import { pick, take, drop } from 'lodash';

import { getService } from '../utils';
import constants from '../../../../server/src/services/constants';
import type { AdminUser } from '../../../../shared/contracts/shared';

const { SUPER_ADMIN_CODE } = constants;

type DisabledUser = Pick<AdminUser, 'id' | 'isActive'>;

/**
 * Returns users disabled by seat enforcement, or an empty list when none are stored.
 */
const getDisabledUserList = async (): Promise<DisabledUser[]> => {
  const disabledUsers = (await strapi.store.get({ type: 'ee', key: 'disabled_users' })) as
    | DisabledUser[]
    | null
    | undefined;

  return disabledUsers ?? [];
};

const enableMaximumUserCount = async (numberOfUsersToEnable: number) => {
  const disabledUsers = await getDisabledUserList();
  const orderedDisabledUsers = [...disabledUsers].reverse();

  const usersToEnable = take(orderedDisabledUsers, numberOfUsersToEnable);

  await strapi.db.query('admin::user').updateMany({
    where: { id: usersToEnable.map((user) => user?.id) },
    data: { isActive: true },
  });

  const remainingDisabledUsers = drop(orderedDisabledUsers, numberOfUsersToEnable);

  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: remainingDisabledUsers,
  });
};

const disableUsersAboveLicenseLimit = async (numberOfUsersToDisable: number) => {
  const currentlyDisabledUsers = await getDisabledUserList();

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
    where: { id: usersToDisable.map((user) => user?.id) },
    data: { isActive: false },
  });

  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: currentlyDisabledUsers.concat(
      usersToDisable.map((user) => pick(user, ['id', 'isActive']))
    ),
  });
};

const syncDisabledUserRecords = async () => {
  const disabledUsers = await getDisabledUserList();

  if (disabledUsers.length === 0) {
    return;
  }

  await strapi.db.query('admin::user').updateMany({
    where: { id: Array.from(disabledUsers, (user) => user?.id) },
    data: { isActive: false },
  });
};

const seatEnforcementWorkflow = async () => {
  const adminSeats = strapi.ee.features.get('seat-limit')?.options?.seats;
  if (adminSeats === undefined) {
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
