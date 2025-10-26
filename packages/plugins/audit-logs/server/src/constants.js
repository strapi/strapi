'use strict';

/**
 * Plugin Constants
 * Centralized constants to prevent magic strings and improve maintainability
 */

// Content type UID for audit logs
const CONTENT_TYPE_UID = 'plugin::audit-logs.audit-log';

// Plugin configuration key
const PLUGIN_CONFIG_KEY = 'plugin::audit-logs';

// Valid action types
const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

// Log message prefix
const LOG_PREFIX = 'audit-logs';

// Default configuration
const DEFAULT_CONFIG = {
  ENABLED: true,
  PAGE_SIZE: 25,
  MAX_PAGE_SIZE: 100,
};

module.exports = {
  CONTENT_TYPE_UID,
  PLUGIN_CONFIG_KEY,
  ACTION_TYPES,
  LOG_PREFIX,
  DEFAULT_CONFIG,
};
