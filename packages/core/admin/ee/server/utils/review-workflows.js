'use strict';

const { get, keys, pickBy, pipe } = require('lodash/fp');
const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

/**
 * Checks if a content type has review workflows enabled.
 * @param {string|Object} contentType - Either the modelUID of the content type, or the content type object.
 * @returns {boolean} Whether review workflows are enabled for the specified content type.
 */
function hasReviewWorkflow({ strapi }, contentType) {
  if (typeof contentType === 'string') {
    // If the input is a string, assume it's the modelUID of the content type and retrieve the corresponding object.
    return hasReviewWorkflow({ strapi }, strapi.getModel(contentType));
  }
  // Otherwise, assume it's the content type object itself and return its `reviewWorkflows` option if it exists.
  return contentType?.options?.reviewWorkflows || false;
}
// TODO To be refactored when multiple workflows are added
const getDefaultWorkflow = async ({ strapi }) =>
  strapi.query(WORKFLOW_MODEL_UID).findOne({ populate: ['stages'] });

const getContentTypeUIDsWithActivatedReviewWorkflows = pipe([
  // Pick only content-types with reviewWorkflows options set to true
  pickBy(get('options.reviewWorkflows')),
  // Get UIDs
  keys,
]);

module.exports = {
  hasReviewWorkflow,
  getDefaultWorkflow,
  getContentTypeUIDsWithActivatedReviewWorkflows,
};
