// config/plugins.js
module.exports = ({ env }) => ({
  // ...
  'audit-log': {
    enabled: true,
    config: {
      // Enable or disable the audit logging globally
      enabled: env.bool('AUDIT_LOG_ENABLED', true),

      // Array of content-type UIDs to exclude from logging
      // (e.g., 'api::article.article')
      // 'plugin::audit-log.audit-log' is always excluded.
      excludeContentTypes: [],
    },
  },
  // ...
});
