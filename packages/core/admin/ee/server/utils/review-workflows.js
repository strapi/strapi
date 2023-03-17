'use strict';

/**
 * Determine if a content type has the review workflows feature enabled
 * @param {Object} contentType
 * @returns
 */
const hasRWEnabled = (contentType) => contentType?.options?.reviewWorkflows || false;

module.exports = {
  hasRWEnabled,
};
