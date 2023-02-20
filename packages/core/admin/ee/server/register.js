'use strict';

const { features } = require('@strapi/strapi/lib/utils/ee');
const { set } = require('lodash/fp');
const executeCERegister = require('../../server/register');
const migrateAuditLogsTable = require('./migrations/audit-logs-table');
const createAuditLogsService = require('./services/audit-logs');

module.exports = async ({ strapi }) => {
  if (features.isEnabled('audit-logs')) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.container.register('audit-logs', auditLogsService);
    await auditLogsService.register();
  }
  if (features.isEnabled('review-workflows')) {
    addReviewWorkflowMiddleware(strapi);
  }
  await executeCERegister({ strapi });
};

/**
 * A Strapi middleware function that adds support for review workflows.
 *
 * @param {object} strapi - The Strapi instance.
 */
const addReviewWorkflowMiddleware = (strapi) => {
  /**
   * A middleware function that moves the `reviewWorkflows` attribute from the top level of
   * the request body to the `options` object within the request body.
   *
   * @param {object} ctx - The Koa context object.
   */
  const moveReviewWorkflowOption = (ctx) => {
    // Move reviewWorkflows to options.reviewWorkflows
    const { reviewWorkflows, ...contentType } = ctx.request.body.contentType;
    ctx.request.body.contentType = set('options.reviewWorkflows', reviewWorkflows, contentType);
  };
  strapi.server.router.use('/content-type-builder/content-types/:uid', (ctx, next) => {
    if (ctx.method === 'PUT') {
      moveReviewWorkflowOption(ctx);
    }
    return next();
  });
  strapi.server.router.use('/content-type-builder/content-types', (ctx, next) => {
    if (ctx.method === 'POST') {
      moveReviewWorkflowOption(ctx);
    }
    return next();
  });
};
