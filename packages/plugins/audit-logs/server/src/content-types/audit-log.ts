export default {
  kind: 'collectionType',
  collectionName: 'audit_logs',
  info: {
    name: 'audit-log',
    displayName: 'Audit Log',
    description: 'Audit log entry for content changes',
  },
  options: {
    draftAndPublish: false,
    comment: '',
  },
  pluginOptions: {
    'content-manager': {
      visible: false,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    contentType: {
      type: 'string',
      required: true,
      configurable: false,
    },
    contentId: {
      type: 'integer',
      required: true,
      configurable: false,
    },
    action: {
      type: 'enumeration',
      enum: ['create', 'update', 'delete'],
      required: true,
      configurable: false,
    },
    userId: {
      type: 'integer',
      configurable: false,
    },
    userEmail: {
      type: 'string',
      configurable: false,
    },
    changedFields: {
      type: 'json',
      configurable: false,
    },
    previousData: {
      type: 'json',
      configurable: false,
    },
    newData: {
      type: 'json',
      configurable: false,
    },
    metadata: {
      type: 'json',
      configurable: false,
    },
    timestamp: {
      type: 'datetime',
      required: true,
      configurable: false,
    },
    ipAddress: {
      type: 'string',
      configurable: false,
    },
    userAgent: {
      type: 'text',
      configurable: false,
    },
  },
};