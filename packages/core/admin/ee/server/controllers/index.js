'use strict';

module.exports = {
  authentication: require('./authentication'),
  role: require('./role'),
  user: require('./user'),
  auditLogs: require('./audit-logs'),
  admin: require('./admin'),
  workflows: require('./workflows'),
  stages: require('./workflows/stages'),
};
