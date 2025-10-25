export default {
  default: {
    enabled: true,
    excludeContentTypes: [] as string[],
    capturePayload: true,
    retentionDays: null as number | null, // null means keep forever
  },
  validator: (config: any) => {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('audit-logs.enabled must be a boolean');
    }
    if (!Array.isArray(config.excludeContentTypes)) {
      throw new Error('audit-logs.excludeContentTypes must be an array');
    }
    if (typeof config.capturePayload !== 'boolean') {
      throw new Error('audit-logs.capturePayload must be a boolean');
    }
    if (config.retentionDays !== null && typeof config.retentionDays !== 'number') {
      throw new Error('audit-logs.retentionDays must be a number or null');
    }
  },
};

