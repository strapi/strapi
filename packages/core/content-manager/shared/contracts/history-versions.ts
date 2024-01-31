import type { Entity, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';
import type { SanitizedAdminUser } from '@strapi/admin/strapi-admin';

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

export interface HistoryVersionDataResponse extends CreateHistoryVersion {
  id: Entity.ID;
  createdAt: Date;
  createdBy: Pick<SanitizedAdminUser, 'id' | 'firstname' | 'lastname' | 'username'>;
}

type Pagination = {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
};

/**
 * GET /content-manager/history-versions
 */
export declare namespace GetHistoryVersions {
  export interface Request {
    state: {
      userAbility: {};
    };
    query: {
      contentType: UID.ContentType;
      documentId: Entity.ID;
      locale?: string;
    };
  }

  export interface Response {
    data: HistoryVersionDataResponse[];
    meta: {
      pagination?: Pagination;
    };
    error?: errors.ApplicationError;
  }
}
