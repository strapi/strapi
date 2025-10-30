export default {
  collectionName: 'audit_logs',
  info: {
    singularName: 'audit-log',
    pluralName: 'audit-logs',
    displayName: 'Audit Log',
    description: 'Records create/update/delete operations performed via the Content API',
  },
  options: {
    draftAndPublish: false,
    timestamps: true,
  },
  attributes: {
    contentType: { type: 'string', required: true, configurable: false },
    recordId: { type: 'uid', configurable: false },
    action: { type: 'string', required: true, configurable: false },
    userId: { type: 'integer', configurable: false },
    userType: { type: 'string', configurable: false },
    payload: { type: 'json' },
    changedFields: { type: 'json' },
    occurredAt: { type: 'datetime', required: true },
  },
  indexes: [
    { name: 'audit_logs_ct_idx', columns: ['contentType'] },
    { name: 'audit_logs_action_idx', columns: ['action'] },
    { name: 'audit_logs_user_idx', columns: ['userId'] },
    { name: 'audit_logs_time_idx', columns: ['occurredAt'] },
  ],
} as const;


