export default {
  kind: 'collectionType',
  collectionName: 'audit_logs',
  info: {
    singularName: 'audit-log',
    pluralName: 'audit-logs',
    displayName: 'Audit Log',
    description: 'Tracks all content changes made through Strapi',
  },
  options: {
    draftAndPublish: false,
    comment: 'Audit log entries for compliance and debugging',
  },
  pluginOptions: {
    'content-manager': {
      visible: true,
    },
    'content-type-builder': {
      visible: false,
    },
  },
  attributes: {
    contentType: {
      type: 'string',
      required: true,
      description: 'Content type name (e.g., api::article.article)',
    },
    recordId: {
      type: 'string',
      required: true,
      description: 'ID of the record that was modified',
    },
    action: {
      type: 'enumeration',
      enum: ['create', 'update', 'delete'],
      required: true,
      description: 'Type of operation performed',
    },
    userId: {
      type: 'integer',
      description: 'ID of the user who performed the action',
    },
    username: {
      type: 'string',
      description: 'Username or email of the user',
    },
    changedFields: {
      type: 'json',
      description: 'For updates: object containing changed fields with old and new values',
    },
    payload: {
      type: 'json',
      description: 'For creates: the full record data; For deletes: the deleted record',
    },
    ipAddress: {
      type: 'string',
      description: 'IP address of the request',
    },
    userAgent: {
      type: 'text',
      description: 'User agent string from the request',
    },
    metadata: {
      type: 'json',
      description: 'Additional metadata about the operation',
    },
  },
  indexes: [
    {
      name: 'audit_logs_content_type_idx',
      columns: ['content_type'],
    },
    {
      name: 'audit_logs_action_idx',
      columns: ['action'],
    },
    {
      name: 'audit_logs_created_at_idx',
      columns: ['created_at'],
    },
    {
      name: 'audit_logs_user_id_idx',
      columns: ['user_id'],
    },
    {
      name: 'audit_logs_content_type_created_at_idx',
      columns: ['content_type', 'created_at'],
    },
  ],
};

