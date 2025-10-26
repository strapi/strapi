'use strict';

const { getService, createLogger } = require('./utils');
const { PLUGIN_CONFIG_KEY } = require('./constants');

/**
 * Create database indexes for optimal query performance
 */
async function createIndexes(strapi) {
  const logger = createLogger(strapi);
  const db = strapi.db.connection;
  const dialect = strapi.db.config.connection.client;

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_content_type ON audit_logs(content_type)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_content_type_timestamp ON audit_logs(content_type, timestamp)',
  ];

  try {
    for (const sql of indexes) {
      await db.raw(sql);
    }
    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.warn('Failed to create indexes (may already exist):', error.message);
  }
}

/**
 * Bootstrap function
 * Registers lifecycle hooks to capture content operations
 */
module.exports = async ({ strapi }) => {
  const logger = createLogger(strapi);

  // Create database indexes
  await createIndexes(strapi);

  // Get the audit log service
  const auditLogService = getService('audit-log');

  // Subscribe to all lifecycle events
  strapi.db.lifecycles.subscribe({
    /**
     * After create hook
     * Logs when a new record is created
     */
    async afterCreate(event) {
      await auditLogService.logOperation('create', event);
    },

    /**
     * After update hook
     * Logs when a record is updated
     */
    async afterUpdate(event) {
      await auditLogService.logOperation('update', event);
    },

    /**
     * After delete hook
     * Logs when a record is deleted
     */
    async afterDelete(event) {
      await auditLogService.logOperation('delete', event);
    },
  });

  logger.info('Plugin initialized - Lifecycle hooks registered');

  // Log configuration status
  const config = strapi.config.get(PLUGIN_CONFIG_KEY);
  if (config?.enabled) {
    logger.info('Audit logging is ENABLED');
    if (config.excludeContentTypes?.length > 0) {
      logger.info(
        `Excluded content types: ${config.excludeContentTypes.join(', ')}`
      );
    }
  } else {
    logger.warn('Audit logging is DISABLED');
  }
};
