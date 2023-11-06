'use strict';

const workflow = require('./workflow');
const workflowStage = require('./workflow-stage');

module.exports = {
  workflow,
  'workflow-stage': workflowStage,
};
