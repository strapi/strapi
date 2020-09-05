'use strict';

// Dependencies.
const { isEmpty } = require('lodash');
const openBrowser = require('./openBrowser');

module.exports = {
  /*
   * Return false where there is no administrator, otherwise return true.
   */
  async isInitialised(strapi) {
    try {
      if (isEmpty(strapi.admin)) {
        return true;
      }

      const numberOfAdministrators = await strapi.query('user', 'admin').find({ _limit: 1 });

      return numberOfAdministrators.length > 0;
    } catch (err) {
      strapi.stopWithError(err);
    }
  },
  openBrowser,
};
