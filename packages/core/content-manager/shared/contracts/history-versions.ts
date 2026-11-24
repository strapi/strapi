import type { Data, Modules, Struct, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';

import type { HISTORY_VERSION_AUTHOR_TYPES, HISTORY_VERSION_SOURCES } from '../constants';

export type HistoryVersionSource = (typeof HISTORY_VERSION_SOURCES)[number];

export type HistoryVersionAuthorType = (typeof HISTORY_VERSION_AUTHOR_TYPES)[number];

export interface HistoryVersionAuthorReference {
  type: HistoryVersionAuthorType;
  model: string;
  id: string;
}

export interface HistoryVersionAuthor extends Omit<HistoryVersionAuthorReference, 'id'> {
  /**
   * `null` when the author was deleted.
   */
  id: string | null;
  /**
   * The current name of the author, `null` when the author was deleted.
   */
  name: string | null;
}

/**
 * Unlike other Content Manager contracts, history versions can't be created via
 * a dedicated API endpoint, but only by the history service listening to other actions.
 * That's why we directly export the create type here.
 */
export interface CreateHistoryVersion {
  contentType: UID.ContentType;
  relatedDocumentId: Data.ID;
  locale: string | null;
  status: 'draft' | 'published' | 'modified' | null;
  data: Modules.Documents.AnyDocument;
  schema: Struct.SchemaAttributes;
  source: HistoryVersionSource;
  author: HistoryVersionAuthorReference;
}

export interface Locale {
  name: string;
  code: string;
}

export interface HistoryVersionDataResponse extends Omit<
  CreateHistoryVersion,
  'locale' | 'author'
> {
  id: Data.ID;
  createdAt: string;
  author: HistoryVersionAuthor | null;
  /**
   * @deprecated Use `author` instead.
   */
  createdBy?: {
    id: Data.ID;
    firstname?: string;
    lastname?: string;
    username?: string;
    email: string;
  };
  locale: Locale | null;
  meta: {
    unknownAttributes: {
      added: Struct.SchemaAttributes;
      removed: Struct.SchemaAttributes;
    };
  };
}

// Export to prevent the TS "cannot be named" error in the history service
export interface Pagination {
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
      documentId?: Data.ID;
      locale?: string;
    } & Partial<Pick<Pagination, 'page' | 'pageSize'>>;
  }

  export type Response =
    | {
        data: HistoryVersionDataResponse[];
        meta: {
          pagination: Pagination;
        };
        error?: never;
      }
    | {
        data?: never;
        meta?: never;
        error: errors.ApplicationError;
      };
}

export declare namespace RestoreHistoryVersion {
  export interface Request {
    params: {
      versionId: Data.ID;
      contentType: UID.ContentType;
    };
    body: {
      contentType: UID.ContentType;
    };
  }

  export type Response =
    | {
        data: {
          documentId: HistoryVersionDataResponse['id'];
        };
        error?: never;
      }
    | {
        data?: never;
        meta?: never;
        error: errors.ApplicationError;
      };
}
