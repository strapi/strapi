'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs');

/**
 * A set of functions called "actions" for `SettingsManager`
 */

module.exports = {

  getGeneralSettings: async (ctx) => {
    // Pick values from `strapi.config`
    const settings = _.pick(strapi.config, [
      'name',
      'version',
      'description'
    ]);

    ctx.body = settings;
  },

  updateSettings: async (ctx) => {
    const data = ctx.request.body;

    try {
      const settingsUpdated = await strapi.plugins['settings-manager'].services.settingsservice.configurationsManager(strapi, data);
      ctx.body = settingsUpdated.values;
    } catch (err) {
      console.log('err', err);
      ctx.status = err && err.status || 400;
      return ctx.body = {
        message: err.msg || 'An error occurred during settings update'
      };
    }
  },

  file: async (ctx) => {
    try {
      const file = fs.readFileSync(path.resolve(__dirname, '..', 'public', 'build', ctx.params.file));
      ctx.body = file;
    } catch (err) {
      ctx.body = ctx.notFound();
    }
  }
};
