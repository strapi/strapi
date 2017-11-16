'use strict';

const fakeData = require('../config/fakeData.json');
const _ = require('lodash');
/**
 * UsersPermissions.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

module.exports = {
  getActions: () => {
    const appControllers = Object.keys(strapi.api).reduce((acc, key) => {
      const actions = Object.keys(strapi.api[key].controllers[key]).reduce((obj, k) => {
        obj[k] = { enabled: false, policy: 'test' };

        return obj;
      }, {});
      acc.controllers[key] = actions;

      return acc;
    },{ controllers: {} });

    const permissions = {
      application: {
        icon: '',
        controllers: appControllers.controllers,
      }
    };

    return permissions;
  },
};
