import type { errors } from '@strapi/utils';
import type { Struct, UID } from '@strapi/types';

// Export required to avoid "cannot be named" TS build error
export interface RecentDocument {
  kind: Struct.ContentTypeKind;
  contentTypeUid: UID.ContentType;
  contentTypeDisplayName: string;
  documentId: string;
  locale: string | null;
  status?: 'draft' | 'published' | 'modified';
  title: string;
  updatedAt: Date;
  publishedAt?: Date | null;
}

export declare namespace GetRecentDocuments {
  export interface Request {
    body: {};
    query: {
      action: 'update' | 'publish';
    };
  }

  export interface Response {
    data: RecentDocument[];
    error?: errors.ApplicationError;
  }
}

export declare namespace GetKeyStatistics {
  export interface Request {
    body: {};
  }

  export interface Response {
    data: {
      assets: number;
      contentTypes: number;
      components: number;
      locales: number | null;
      admins: number;
      webhooks: number;
      apiTokens: number;
    };
    error?: errors.ApplicationError;
  }
}

export declare namespace GetCountDocuments {
  export interface Request {
    body: {};
  }

  export interface Response {
    data: {
      draft: number;
      published: number;
      modified: number;
    };
    error?: errors.ApplicationError;
  }
}
