import { castArray, toNumber, isNil } from 'lodash';
import type { Data } from '@strapi/types';
import ceUser from '../../../../server/src/services/user';
import { getService } from '../utils';

/** Checks if ee disabled users list needs to be updated
 * @param {string} id
 * @param {object} input
 */
const updateEEDisabledUsersList = async (id: Data.ID, input: any) => {
  if (isNil(strapi.ee.seats) === true) {
    return;
  }

  const disabledUsers = await getService('seat-enforcement').getDisabledUserList();

  if (!disabledUsers) {
    return;
  }

  const user = disabledUsers.find((user: any) => user.id === Number(id));
  if (!user) {
    return;
  }

  if (user.isActive !== input.isActive) {
    const newDisabledUsersList = disabledUsers.filter((user: any) => user.id !== Number(id));
    await strapi.store.set({
      type: 'ee',
      key: 'disabled_users',
      value: newDisabledUsersList,
    });
  }
};

const castNumberArray = (ids: unknown) => castArray(ids).map((id) => toNumber(id));

const removeFromEEDisabledUsersList = async (ids: unknown) => {
  if (isNil(strapi.ee.seats) === true) {
    return;
  }

  let idsToCheck: any;
  if (typeof ids === 'object') {
    idsToCheck = castNumberArray(ids);
  } else {
    idsToCheck = [Number(ids)];
  }

  const disabledUsers = await getService('seat-enforcement').getDisabledUserList();

  if (!disabledUsers) {
    return;
  }

  const newDisabledUsersList = disabledUsers.filter((user: any) => !idsToCheck.includes(user.id));
  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: newDisabledUsersList,
  });
};

const updateById: typeof ceUser.updateById = async (id, attributes) => {
  const updatedUser = await ceUser.updateById(id, attributes);

  await updateEEDisabledUsersList(id, attributes);

  return updatedUser;
};

const deleteById: typeof ceUser.deleteById = async (id) => {
  const deletedUser = await ceUser.deleteById(id);

  if (deletedUser !== null) {
    await removeFromEEDisabledUsersList(id);
  }

  return deletedUser;
};

const deleteByIds: typeof ceUser.deleteByIds = async (ids) => {
  const deletedUsers = await ceUser.deleteByIds(ids);

  await removeFromEEDisabledUsersList(ids);

  return deletedUsers;
};

const getCurrentActiveUserCount = async () => {
  return strapi.db.query('admin::user').count({ where: { isActive: true } });
};

export default {
  updateEEDisabledUsersList,
  removeFromEEDisabledUsersList,
  getCurrentActiveUserCount,
  deleteByIds,
  deleteById,
  updateById,
};
