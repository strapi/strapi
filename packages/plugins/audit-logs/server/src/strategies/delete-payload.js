'use strict';

const { sanitizeData } = require('../utils');

/**
 * Delete Payload Strategy
 * Builds payload for delete operations
 */
module.exports = {
  /**
   * Build payload for delete operation
   * @param {object} event - The lifecycle event
   * @returns {object} The payload
   */
  build(event) {
    // Sanitize deleted data to prevent logging sensitive information
    const deletedData = event.state?.originalData || null;

    return {
      action: 'delete',
      where: event.params?.where || {},
      deletedData: deletedData ? sanitizeData(deletedData) : null,
      result: event.result || null,
    };
  },
};
