'use strict';

const contentType = require('./content-type');

module.exports = context => ({
  ...contentType(context),
});
