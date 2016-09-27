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
    const packageJSONPath = fs.readFileSync(path.resolve(strapi.config.appPath, 'package.json'));
    const packageJSONContent = JSON.parse(packageJSONPath, 'utf8');

    // Update application name
    if (this.request.body.name) {
      packageJSONContent.name = this.request.body.name;
    }

    if (this.request.body.description) {
      packageJSONContent.description = this.request.body.description;
    }

    if (this.request.body.version) {
      packageJSONContent.version = this.request.body.version;
    }


    fs.writeFileSync('package.json', JSON.stringify(packageJSONContent, null, 4), 'utf8');

    return this.body = {
      name: packageJSONContent.name
    };
  },

  file: function* () {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }

};
