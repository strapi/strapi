import type { Entity, UID } from '@strapi/types';

// The base type, without ID, createdAt, createdBy
interface BaseHistoryVersion {
  contentType: UID.ContentType;
  relatedDocumentId: Entity.ID;
  locale: string;
  status: 'draft' | 'published' | 'modified';
  data: Record<string, unknown>;
  schema: Record<string, unknown>;
}

/**
 * Unlike other Content Manager contracts, history versions can't be created via the API,
 * but only by the history service. That's why we export the create type directly here.
 */
export interface CreateHistoryVersion extends BaseHistoryVersion {
  createdBy: Entity.ID;
}
