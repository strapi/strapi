'use strict';

const { STAGE_DEFAULT_COLOR } = require('../constants/workflows');

async function migrateReviewWorkflowStagesColor({ oldContentTypes, contentTypes }) {
  // Check if stages table name has a color attribute
  const hadColor = !!oldContentTypes?.['admin::workflow-stage']?.attributes?.color;
  const hasColor = !!contentTypes['admin::workflow-stage']?.attributes?.color;

  // Add the default stage color if color attribute was added
  if (!hadColor || hasColor) {
    await strapi.query('admin::workflow-stage').updateMany({
      data: {
        color: STAGE_DEFAULT_COLOR,
      },
    });
  }
}

module.exports = migrateReviewWorkflowStagesColor;
