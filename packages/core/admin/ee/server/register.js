'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCERegister = require('../../server/register');
const migrateAuditLogsTable = require('./migrations/audit-logs-table');
const createAuditLogsService = require('./services/audit-logs');
const reviewWorkflowsMiddlewares = require('./middlewares/review-workflows');
const { getService } = require('./utils');

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    await auditLogsService.register();
  }
  if (features.isEnabled('review-workflows')) {
    const reviewWorkflowService = getService('review-workflows');

    reviewWorkflowsMiddlewares.contentTypeMiddleware(strapi);
    await reviewWorkflowService.register();
  }
  await executeCERegister({ strapi });
};
