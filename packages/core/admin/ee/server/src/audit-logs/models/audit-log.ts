import type { Model } from '@strapi/database';

const auditLog: Model = {
  uid: 'admin::audit-log',
  tableName: 'strapi_audit_logs',
  singularName: 'audit-log',
  attributes: {
    id: {
      type: 'increments',
    },
    action: {
      type: 'string',
      required: true,
    },
    date: {
      type: 'datetime',
      required: true,
    },
    // @ts-expect-error database model is not yet updated to support useJoinTable
    user: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
      useJoinTable: false,
    },
    payload: {
      type: 'json',
    },
  },
};

export { auditLog };
