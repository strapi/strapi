'use strict';

const { sanitizeData } = require('../utils');

/**
 * Create Payload Strategy
 * Builds payload for create operations
 */
module.exports = {
  /**
   * Build payload for create operation
   * @param {object} event - The lifecycle event
   * @returns {object} The payload
   */
  build(event) {
    return {
      action: 'create',
      data: sanitizeData(event.params?.data || {}),
      result: event.result
        ? {
            id: event.result.id,
            documentId: event.result.documentId,
          }
        : null,
    };
  },
};
