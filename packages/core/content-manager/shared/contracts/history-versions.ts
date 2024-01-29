import type { Entity, UID } from '@strapi/types';

/**
 * Unlike other Content Manager contracts, history versions can't be created via
 * a dedicated API endpoint, but only by the history service listening to other actions.
 * That's why we directly export the create type here.
 */
export interface CreateHistoryVersion {
  contentType: UID.ContentType;
  relatedDocumentId: Entity.ID;
  locale: string;
  status: 'draft' | 'published' | 'modified' | null;
  data: Record<string, unknown>;
  schema: Record<string, unknown>;
}
