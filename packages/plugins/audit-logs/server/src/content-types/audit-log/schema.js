'use strict';

module.exports = {
  kind: 'collectionType',
  collectionName: 'audit_logs',
  info: {
    singularName: 'audit-log',
    pluralName: 'audit-logs',
    displayName: 'Audit Log',
    description: 'Audit log entries for content operations',
  },
  options: {
    draftAndPublish: false,
    comment: 'Stores audit trail of all content operations',
  },
  pluginOptions: {
    'content-manager': {
      visible: false, // Hide from Content Manager UI
    },
    'content-type-builder': {
      visible: false, // Hide from Content Type Builder UI
    },
  },
  attributes: {
    contentType: {
      type: 'string',
      required: true,
      description: 'Content type UID (e.g., api::article.article)',
    },
    recordId: {
      type: 'string',
      required: true,
      description: 'ID or documentId of the affected record',
    },
    action: {
      type: 'enumeration',
      enum: ['create', 'update', 'delete'],
      required: true,
      description: 'Type of operation performed',
    },
    timestamp: {
      type: 'datetime',
      required: true,
      description: 'When the operation occurred',
    },
    userId: {
      type: 'integer',
      description: 'ID of the user who performed the action (null if unauthenticated)',
    },
    userEmail: {
      type: 'string',
      description: 'Email of the user who performed the action',
    },
    payload: {
      type: 'json',
      description: 'Operation payload (full data for create, changed fields for update, deleted data for delete)',
    },
  },
};
