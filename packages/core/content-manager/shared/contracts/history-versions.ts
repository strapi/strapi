import type { Entity, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';

/**
 * Unlike other Content Manager contracts, history versions can't be created via
 * a dedicated API endpoint, but only by the history service listening to other actions.
 * That's why we directly export the create type here.
 */
export interface CreateHistoryVersion {
  contentType: UID.ContentType;
  relatedDocumentId: Entity.ID;
  locale: string | null;
  status: 'draft' | 'published' | 'modified' | null;
  data: Record<string, unknown>;
  schema: Record<string, unknown>;
}

interface Locale {
  name: string;
  code: string;
}

export interface HistoryVersionDataResponse extends Omit<CreateHistoryVersion, 'locale'> {
  id: Entity.ID;
  createdAt: string;
  createdBy?: {
    id: Entity.ID;
    firstname?: string;
    lastname?: string;
    username?: string;
    email: string;
  };
  locale: Locale | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

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
      documentId?: Entity.ID;
      locale?: string;
    } & Partial<Pick<Pagination, 'page' | 'pageSize'>>;
  }

  export interface Response {
    data: HistoryVersionDataResponse[];
    meta: {
      pagination?: Pagination;
    };
    error?: errors.ApplicationError;
  }
}
