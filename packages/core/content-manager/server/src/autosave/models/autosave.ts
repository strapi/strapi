import type { Model } from '@strapi/database';
import { AUTOSAVE_UID } from '../constants';

/**
 * A per-user sidecar of in-progress edits. It is never read by the Content API, Preview, or
 * another editor: it only exists so the author can recover work they never committed to the
 * shared draft, from any device.
 */
const autosave: Model = {
  uid: AUTOSAVE_UID,
  tableName: 'strapi_autosaves',
  singularName: 'autosave',
  attributes: {
    id: {
      type: 'increments',
    },
    contentType: {
      type: 'string',
      column: { notNullable: true },
    },
    documentId: {
      type: 'string',
      column: { notNullable: true },
    },
    /**
     * Empty rather than null for content types without i18n, so the scope stays a single
     * unique tuple on every supported database.
     */
    locale: {
      type: 'string',
      column: { notNullable: true, defaultTo: '' },
    },
    data: {
      type: 'json',
    },
    baseVersion: {
      type: 'string',
    },
    savedAt: {
      type: 'datetime',
      default: () => new Date(),
    },
    // FIXME: joinTable should be optional
    // @ts-expect-error database model is not yet updated to support useJoinTable
    user: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
      useJoinTable: false,
    },
  },
  indexes: [
    {
      name: 'strapi_autosaves_scope_unique',
      columns: ['user_id', 'content_type', 'document_id', 'locale'],
      type: 'unique',
    },
  ],
};

export { autosave };
