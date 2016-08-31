'use strict';

const sendfile = require('koa-sendfile');
const path = require('path');

/**
 * A set of functions called "actions" for `SettingsManager`
 */

module.exports = {

  find: function *() {
    this.body = [];
  },

  file: function *() {
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }

};
