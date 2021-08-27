'use strict';

const { isEmpty, isNil } = require('lodash/fp');

/**
 * Test if the strapi application is considered as initialized (1st user has been created)
 * @param {Strapi} strapi
 * @returns {boolean}
 */
module.exports = async function isInitialized(strapi) {
  try {
    if (isEmpty(strapi.admin)) {
      return true;
    }

    // test if there is at least one admin
    const anyAdministrator = await strapi.query('admin::user').findOne({ select: ['id'] });

    return !isNil(anyAdministrator);
  } catch (err) {
    strapi.stopWithError(err);
  }
};
