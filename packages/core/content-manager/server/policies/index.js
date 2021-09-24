'use strict';

const hasDraftAndPublish = require('./has-draft-and-publish');
const hasPermissions = require('./hasPermissions');
const routing = require('./routing');

module.exports = {
  'has-draft-and-publish': hasDraftAndPublish,
  hasPermissions,
  routing,
};
