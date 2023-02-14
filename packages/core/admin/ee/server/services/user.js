'use strict';

const _ = require('lodash');

/** Checks if ee disabled users list needs to be updated
 * @param {string} id
 * @param {object} input
 */
const shouldUpdateEEDisabledUsersList = async (id, input) => {
  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (!data?.value || data.value.length === 0) {
    return;
  }
  const disabledUsers = JSON.parse(data.value);
  const user = disabledUsers.find((user) => user.id === Number(id));
  if (!user) {
    return;
  } 

  if (user.isActive !== input.isActive) {
    const newDisabledUsersList = disabledUsers.filter((user) => user.id !== Number(id));
    await strapi.db.query('strapi::ee-store').update({
      where: { id: data.id },
      data: { value: JSON.stringify(newDisabledUsersList) },
    });
  }
};

const shouldRemoveFromEEDisabledUsersList = async (ids) => {
  let idsToCheck;
  if (typeof ids === 'object') {
    idsToCheck = [...ids];
  } else {
    idsToCheck = [Number(ids)];
  }

  const data = await strapi.db.query('strapi::ee-store').findOne({
    where: { key: 'ee_disabled_users' },
  });

  if (!data?.value || data.value.length === 0) {
    return;
  }
  const disabledUsers = JSON.parse(data.value);

  const newDisabledUsersList = _.filter(disabledUsers, (user) => !idsToCheck.includes(user.id));
  await strapi.db.query('strapi::ee-store').update({
    where: { id: data.id },
    data: { value: JSON.stringify(newDisabledUsersList) },
  });
};

module.exports = {
  shouldUpdateEEDisabledUsersList,
  shouldRemoveFromEEDisabledUsersList,
};
