'use strict';

const { hasReviewWorkflow } = require('../utils/review-workflows');

/**
 * Remove all stage information for all content types that have had review workflows disabled
 */
/* eslint-disable no-continue */
const disableOnContentTypes = async ({ oldContentTypes, contentTypes }) => {
  const uidsToRemove = [];
  for (const uid in contentTypes) {
    if (!oldContentTypes || !oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes?.[uid];

    if (
      hasReviewWorkflow({ strapi }, oldContentType) &&
      !hasReviewWorkflow({ strapi }, contentType)
    ) {
      // If review workflows has been turned off on a content type
      // remove stage information from all entities within this CT
      uidsToRemove.push(uid);
    }
  }

  if (uidsToRemove.length === 0) {
    return;
  }

  await strapi.db
    .connection('strapi_workflows_stages_related_morphs')
    .whereIn('related_type', uidsToRemove)
    .del();
};

module.exports = { disableOnContentTypes };
