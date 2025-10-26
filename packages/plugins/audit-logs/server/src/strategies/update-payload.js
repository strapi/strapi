'use strict';

const { sanitizeData } = require('../utils');

/**
 * Update Payload Strategy
 * Builds payload for update operations
 */
module.exports = {
  /**
   * Build payload for update operation
   * @param {object} event - The lifecycle event
   * @returns {object} The payload
   */
  build(event) {
    return {
      action: 'update',
      changes: sanitizeData(event.params?.data || {}),
      where: event.params?.where || {},
      result: event.result
        ? {
            id: event.result.id,
            documentId: event.result.documentId,
          }
        : null,
    };
  },
};
