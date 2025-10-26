'use strict';

const { createLogger } = require('../utils');

/**
 * Record ID Extractor Service
 * Extracts record IDs from lifecycle events
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
  /**
   * Extract record ID from a lifecycle event
   * @param {string} action - The action type (create, update, delete)
   * @param {object} event - The lifecycle event object
   * @returns {string|null} The record ID or null if not found
   */
  extract(action, event) {
    try {
      switch (action) {
        case 'create':
          return this.extractFromCreate(event);
        case 'update':
          return this.extractFromUpdate(event);
        case 'delete':
          return this.extractFromDelete(event);
        default:
          logger.warn(`Unknown action type: ${action}`);
          return null;
      }
    } catch (error) {
      logger.error('Failed to extract record ID', error);
      return null;
    }
  },

  /**
   * Extract record ID from create event
   * @param {object} event - The create event
   * @returns {string|null} The record ID
   */
  extractFromCreate(event) {
    // After create, the result contains the created record
    if (event.result) {
      return this.extractIdFromRecord(event.result);
    }

    // Fallback: try to get from params data
    if (event.params && event.params.data) {
      return this.extractIdFromRecord(event.params.data);
    }

    return null;
  },

  /**
   * Extract record ID from update event
   * @param {object} event - The update event
   * @returns {string|null} The record ID
   */
  extractFromUpdate(event) {
    // Try result first (updated record)
    if (event.result) {
      return this.extractIdFromRecord(event.result);
    }

    // Try where clause (query filter)
    if (event.params && event.params.where) {
      return this.extractIdFromRecord(event.params.where);
    }

    // Try state (may contain original data)
    if (event.state && event.state.originalId) {
      return String(event.state.originalId);
    }

    return null;
  },

  /**
   * Extract record ID from delete event
   * @param {object} event - The delete event
   * @returns {string|null} The record ID
   */
  extractFromDelete(event) {
    // Try where clause first
    if (event.params && event.params.where) {
      return this.extractIdFromRecord(event.params.where);
    }

    // Try result (some delete operations return the deleted record)
    if (event.result) {
      return this.extractIdFromRecord(event.result);
    }

    // Try state
    if (event.state && event.state.originalId) {
      return String(event.state.originalId);
    }

    return null;
  },

  /**
   * Extract ID from a record object
   * Handles both documentId and id fields
   * @param {object} record - The record object
   * @returns {string|null} The ID
   */
  extractIdFromRecord(record) {
    if (!record) {
      return null;
    }

    // Try documentId first (Strapi 5 format)
    if (record.documentId) {
      return String(record.documentId);
    }

    // Try id (traditional format)
    if (record.id) {
      return String(record.id);
    }

    return null;
  },
  };
};
