'use strict';

const sendfile = require('koa-sendfile');
const path = require('path');
const _ = require('lodash');

/**
 * A set of functions called "actions" for `SettingsManager`
 */

module.exports = {

  getGeneralSettings: function *() {

    // Pick values from `strapi.config`
    const settings = _.pick(strapi.config, [
      'name',
      'version',
      'description'
    ]);

    this.body = settings;
  },

  file: function *() {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }

};
