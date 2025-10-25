export default {
  enabled: process.env.AUDIT_LOG_ENABLED !== 'false',

  excludeContentTypes: process.env.AUDIT_LOG_EXCLUDE_CONTENT_TYPES 
    ? process.env.AUDIT_LOG_EXCLUDE_CONTENT_TYPES.split(',')
    : [
        'audit-log',
        'strapi::core-store',
        'strapi::webhook',
        'strapi::api-token',
        'strapi::transfer-token',
        'strapi::api-token-permission',
        'strapi::transfer-token-permission'
      ],

  excludedFields: [
    'id',
    'documentId',
    'createdAt',
    'updatedAt',
    'createdBy',
    'updatedBy',
    'publishedAt',
    'publishedBy'
  ],
  cleanupDays: parseInt(process.env.AUDIT_LOG_CLEANUP_DAYS) || 90,
  maxDataSize: 10000,
  includeRequestMetadata: true,
  includeUserInfo: true,
  logLevels: ['create', 'update', 'delete'],

  customMetadata: {
    version: '1.0',
    source: 'strapi-audit-log'
  },

  permissions: {
    readPermission: 'plugin::audit-log.read_audit_logs',
    writePermission: 'plugin::audit-log.write_audit_logs',
    adminPermission: 'plugin::audit-log.admin_audit_logs',
    defaultRoles: ['Super Admin', 'Editor'],
    allowAnonymous: false,
    requirePermissions: {
      read: true,
      write: true,
      admin: true
    }
  },

  security: {
    encryptSensitiveData: false,
    hashIpAddresses: false,
    maskSensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization'
    ],
    rateLimitPerUser: 1000,
    rateLimitPerIp: 5000
  },

  performance: {
    batchSize: 100,
    enableIndexing: true,
    enableCaching: true,
    cacheTtl: 300
  },

  notifications: {
    enableEmailNotifications: false,
    notificationEmails: [],
    notificationEvents: ['bulk_delete', 'system_error']
  }
};
