'use strict';

// TODO move admin controllers to `admin-ctrl-name` form
module.exports = {
  authentication: require('./authentication'),
  role: require('./role'),
  user: require('./user'),
  auditLogs: require('./audit-logs'),
  admin: require('./admin'),
  workflows: require('./workflows'),
  stages: require('./workflows/stages'),
  'content-api-workflows': require('./content-api/workflows'),
  'content-api-stages': require('./content-api/workflows/stages'),
};
