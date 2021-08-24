'use strict';

const contentAPIFactory = require('./content-api');

module.exports = context => ({
  buildContentAPISchema: contentAPIFactory(context),
});
