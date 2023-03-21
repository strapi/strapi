'use strict';

const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

/**
 * Determine if a content type has the review workflows feature enabled
 * @param {Object} contentType
 * @returns
 */
const hasRWEnabled = (contentType) => contentType?.options?.reviewWorkflows || false;

// TODO To be refactored when multiple workflows are added
const getDefaultWorkflow = async ({ strapi }) =>
  strapi.query(WORKFLOW_MODEL_UID).findOne({ populate: ['stages'] });

module.exports = {
  hasRWEnabled,
  getDefaultWorkflow,
};
