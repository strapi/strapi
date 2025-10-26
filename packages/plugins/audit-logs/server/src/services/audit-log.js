'use strict';

const { getService, createLogger } = require('../utils');
const { CONTENT_TYPE_UID, PLUGIN_CONFIG_KEY } = require('../constants');

/**
 * Main Audit Log Service
 * Coordinates all other services to handle audit logging operations
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
  /**
   * Log an operation from a lifecycle event
   * This is the main entry point called by lifecycle hooks
   * @param {string} action - The action type (create, update, delete)
   * @param {object} event - The lifecycle event
   * @returns {Promise<object|null>} The created audit log entry or null
   */
  async logOperation(action, event) {
    try {
      // Check if logging is enabled
      if (!this.isLoggingEnabled()) {
        return null;
      }

      // Get content type from event
      const contentType = event.model?.uid;
      if (!contentType) {
        logger.debug('No content type found in event');
        return null;
      }

      // Hardcoded protection: Never log audit-logs themselves (prevent infinite loop)
      if (contentType === CONTENT_TYPE_UID) {
        return null;
      }

      // Check if content type is excluded
      if (this.isContentTypeExcluded(contentType)) {
        return null;
      }

      // Extract record ID
      const recordIdExtractor = getService('record-id-extractor');
      const recordId = recordIdExtractor.extract(action, event);

      if (!recordId) {
        logger.debug(`Could not extract record ID for ${action} on ${contentType}`);
        return null;
      }

      // Resolve user context
      const contextResolver = getService('context-resolver');
      const user = contextResolver.resolveUser();

      // Build payload
      const payloadBuilder = getService('payload-builder');
      const payload = payloadBuilder.build(action, event);

      // Prepare log entry
      // Note: new Date() creates a UTC timestamp (stored as milliseconds since epoch)
      // Database adapters will handle timezone conversion as needed
      const logEntry = {
        contentType,
        recordId,
        action,
        timestamp: new Date(),
        userId: user?.id || null,
        userEmail: user?.email || null,
        payload,
      };

      // Write to database
      const logWriter = getService('log-writer');
      return await logWriter.write(logEntry);
    } catch (error) {
      // Catch all errors - logging failures shouldn't break operations
      logger.error('Failed to log operation', {
        error: error.message,
        action,
        contentType: event.model?.uid,
      });
      return null;
    }
  },

  /**
   * Query audit logs with filters, pagination, and sorting
   * @param {object} filters - Query filters
   * @param {object} pagination - Pagination options
   * @param {object} sort - Sorting options
   * @returns {Promise<object>} Results with pagination metadata
   */
  async find(filters, pagination, sort) {
    const logReader = getService('log-reader');
    return await logReader.findMany(filters, pagination, sort);
  },

  /**
   * Find a single audit log entry by ID
   * @param {string} id - The audit log entry ID
   * @returns {Promise<object|null>} The audit log entry or null
   */
  async findOne(id) {
    const logReader = getService('log-reader');
    return await logReader.findOne(id);
  },

  /**
   * Get audit log statistics
   * @param {object} filters - Query filters
   * @returns {Promise<object>} Statistics
   */
  async getStatistics(filters) {
    const logReader = getService('log-reader');
    return await logReader.getStatistics(filters);
  },

  /**
   * Check if logging is enabled globally
   * @returns {boolean} True if logging is enabled
   */
  isLoggingEnabled() {
    const config = strapi.config.get(PLUGIN_CONFIG_KEY);
    return config?.enabled !== false;
  },

  /**
   * Check if a content type is excluded from logging
   * @param {string} contentType - The content type UID
   * @returns {boolean} True if excluded
   */
  isContentTypeExcluded(contentType) {
    const config = strapi.config.get(PLUGIN_CONFIG_KEY);
    const excludedTypes = config?.excludeContentTypes || [];
    return excludedTypes.includes(contentType);
  },

  /**
   * Clean up old audit logs based on retention period
   * @param {number} retentionDays - Number of days to retain logs
   * @returns {Promise<number>} Number of deleted logs
   */
  async cleanupOldLogs(retentionDays) {
    try {
      if (!retentionDays || retentionDays < 1) {
        throw new Error('retentionDays must be a positive number');
      }

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(
        `Cleaning up logs older than ${retentionDays} days (before ${cutoffDate.toISOString()})`
      );

      // Delete old logs
      const result = await strapi.db.query(CONTENT_TYPE_UID).deleteMany({
        where: {
          timestamp: {
            $lt: cutoffDate,
          },
        },
      });

      const deletedCount = result?.count || 0;
      logger.info(`Deleted ${deletedCount} old audit log entries`);

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old logs', error);
      throw error;
    }
  },
  };
};
