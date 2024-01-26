import type { Entity, UID } from '@strapi/types';

/**
 * Unlike other Content Manager contracts, history versions can't be created via the API,
 * but only by the history service. That's why we export the create type directly here.
 */
export interface CreateHistoryVersion {
  contentType: UID.ContentType;
  relatedDocumentId: Entity.ID;
  locale: string;
  status: 'draft' | 'published' | 'modified' | null;
  data: Record<string, unknown>;
  schema: Record<string, unknown>;
}
