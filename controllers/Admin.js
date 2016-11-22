'use strict';

const path = require('path');
const sendfile = require('koa-sendfile');
const _ = require('lodash');
/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {

  index: function *() {
    // Send the HTML file with injected scripts
    this.body = strapi.plugins.admin.services.admin.generateAdminIndexFile();
  },

  file: function *() {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }
};
