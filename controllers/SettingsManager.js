'use strict';

const sendfile = require('koa-sendfile');
const path = require('path');
const _ = require('lodash');
const fs = require('fs');

/**
 * A set of functions called "actions" for `SettingsManager`
 */

module.exports = {

  getGeneralSettings: function* () {
    // Pick values from `strapi.config`
    const settings = _.pick(strapi.config, [
      'name',
      'version',
    'description'
    ]);

    this.body = settings;
  },

  updateSettings: function* () {
    var data = this.request.body;

    try {
      const settingsUpdated = yield strapi.plugins['settings-manager'].services.settingsservice.configurationsManager(strapi, data);
      this.body = settingsUpdated.values;
    } catch (err) {
      console.log('err', err);
      this.status = err && err.status || 400;
      return this.body = {
        message: err.msg || 'An error occurred during settings update'
      };
    };
  },

  file: function* () {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }
};
