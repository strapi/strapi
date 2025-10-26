'use strict';

const { CONTENT_TYPE_UID } = require('../constants');
const { createLogger, mapLogEntryToDb } = require('../utils');

/**
 * Log Writer Service
 * Writes audit log entries to the database
 */
module.exports = ({ strapi }) => {
  const logger = createLogger(strapi);

  return {
    /**
     * Write an audit log entry to the database
     * @param {object} logEntry - The audit log entry
     * @returns {Promise<object>} The created audit log entry
     */
    async write(logEntry) {
      try {
        // Map log entry to database format
        const data = mapLogEntryToDb(logEntry);

        const entry = await strapi.db.query(CONTENT_TYPE_UID).create({ data });

        logger.debug(
          `Created log entry for ${logEntry.action} on ${logEntry.contentType}#${logEntry.recordId}`
        );

        return entry;
      } catch (error) {
        // Don't throw - logging failures shouldn't break operations
        logger.error('Failed to write audit log entry', {
          error: error.message,
          logEntry,
        });
        return null;
      }
    },

    /**
     * Write multiple audit log entries in batch
     * @param {Array<object>} logEntries - Array of audit log entries
     * @returns {Promise<Array<object>>} The created audit log entries
     */
    async writeBatch(logEntries) {
      if (!Array.isArray(logEntries) || logEntries.length === 0) {
        return [];
      }

      try {
        // Map all entries to database format
        const data = logEntries.map(mapLogEntryToDb);

        const entries = await strapi.db.query(CONTENT_TYPE_UID).createMany({ data });

        logger.debug(`Created ${entries.count || 0} log entries in batch`);

        return entries;
      } catch (error) {
        logger.error('Failed to write batch audit log entries', {
          error: error.message,
          count: logEntries.length,
        });
        return [];
      }
    },
  };
};
