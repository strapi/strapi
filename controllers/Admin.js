'use strict';

const sendfile = require('koa-sendfile');
const path = require('path');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {

  index: function *() {
    console.log('index');

    // Send the admin build
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', 'index.html'));
    if (!this.status) this.throw(404);
  },

  file: function *() {
  console.log('file');
    // TODO: manage assets
    console.log(this.params) ;


    // Send the admin build
    // TODO: manage assets
    yield sendfile(this, path.resolve(__dirname, '..', 'public', 'build', this.params.file));
    if (!this.status) this.throw(404);
  }


};
