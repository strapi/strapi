import type { Data, Modules, Struct, UID } from '@strapi/types';
import { type errors } from '@strapi/utils';

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
  componentsSchemas: Record<`${string}.${string}`, Struct.SchemaAttributes>;
}

export interface Locale {
  name: string;
  code: string;
}

export interface HistoryVersionDataResponse extends Omit<CreateHistoryVersion, 'locale'> {
  id: Data.ID;
  createdAt: string;
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
