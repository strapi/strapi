'use strict';

/**
 * Determine if a content type has the review workflows feature enabled
 * @param {Object} contentType
 * @returns
 */
const hasRWEnabled = (contentType) => contentType?.options?.reviewWorkflows || false;

/**
 * Remove all stage information for all content types that have had review workflows disabled
 */
/* eslint-disable no-continue */
const disableReviewWorkFlows = async ({ oldContentTypes, contentTypes }) => {
  for (const uid in contentTypes) {
    if (!oldContentTypes[uid]) {
      continue;
    }

    const oldContentType = oldContentTypes[uid];
    const contentType = contentTypes[uid];

    const uidsToRemove = [];
    if (hasRWEnabled(oldContentType) && !hasRWEnabled(contentType)) {
      // If review workflows has been turned off on a content type
      // remove stage information from all entities within this CT
      uidsToRemove.push(uid);
    }

    if (uidsToRemove.length === 0) {
      continue;
    }

    await strapi.db
      .connection('strapi_workflows_stages_related_morphs')
      .whereIn('id', uidsToRemove)
      .del();
  }
};

module.exports = disableReviewWorkFlows;
