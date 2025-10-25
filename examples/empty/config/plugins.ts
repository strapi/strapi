export default () => ({
  // Enable the Audit Logs plugin
  'audit-logs': {
    enabled: true,
    config: {
      // Enable audit logging
      enabled: true,
      // Don't exclude any content types for testing
      excludeContentTypes: [],
      // Capture full payload
      capturePayload: true,
      // Keep logs forever for testing (no auto-cleanup)
      retentionDays: null,
    },
  },
});
