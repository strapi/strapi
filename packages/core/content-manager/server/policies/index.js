'use strict';

const hasDraftAndPublish = require('./has-draft-and-publish');
const hasPermissions = require('./hasPermissions');

module.exports = {
  'has-draft-and-publish': hasDraftAndPublish,
  hasPermissions,
};
