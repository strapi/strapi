/**
 * Example configuration for the Audit Logs plugin
 * 
 * To use this in your Strapi project:
 * 1. Copy this configuration to your project's config/plugins.js
 * 2. Adjust the settings based on your requirements
 */

module.exports = {
  'audit-logs': {
    // Enable the plugin
    enabled: true,
    
    config: {
      /**
       * Enable or disable audit logging globally
       * @type {boolean}
       * @default true
       */
      enabled: true,

      /**
       * List of content type UIDs to exclude from audit logging
       * 
       * Examples:
       * - 'api::article.article'
       * - 'api::comment.comment'
       * - 'plugin::upload.file'
       * 
       * Note: The audit log content type itself and admin/strapi content types
       * are automatically excluded to prevent infinite loops and unnecessary logs.
       * 
       * @type {string[]}
       * @default []
       */
      excludeContentTypes: [
        // Example: Exclude temporary data that changes frequently
        // 'api::session.session',
        // 'api::analytics.analytics',
      ],

      /**
       * Whether to capture the full request payload in audit logs
       * 
       * Set to false if you want to reduce storage size and only track
       * that a change occurred without storing the full data.
       * 
       * @type {boolean}
       * @default true
       */
      capturePayload: true,

      /**
       * Number of days to retain audit logs before automatic cleanup
       * 
       * Set to null to keep logs forever.
       * Set to a number (e.g., 90) to automatically delete logs older than that many days.
       * The cleanup runs daily at 2:00 AM.
       * 
       * @type {number|null}
       * @default null
       */
      retentionDays: null, // Example: 90 for 90 days

      // Production example with retention:
      // retentionDays: 90,
    },
  },
};

/**
 * Environment-specific configuration example:
 * 
 * module.exports = ({ env }) => ({
 *   'audit-logs': {
 *     enabled: true,
 *     config: {
 *       enabled: env.bool('AUDIT_LOGS_ENABLED', true),
 *       retentionDays: env.int('AUDIT_LOGS_RETENTION_DAYS', null),
 *       excludeContentTypes: env.array('AUDIT_LOGS_EXCLUDE', []),
 *       capturePayload: env.bool('AUDIT_LOGS_CAPTURE_PAYLOAD', true),
 *     },
 *   },
 * });
 * 
 * With .env file:
 * AUDIT_LOGS_ENABLED=true
 * AUDIT_LOGS_RETENTION_DAYS=90
 * AUDIT_LOGS_EXCLUDE=api::session.session,api::analytics.analytics
 * AUDIT_LOGS_CAPTURE_PAYLOAD=true
 */

