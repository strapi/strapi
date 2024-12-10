import type { errors } from '@strapi/utils';
import type { Struct, UID } from '@strapi/types';

// Export required to avoid "cannot be named" TS build error
export interface RecentDocument {
  kind: Struct.ContentTypeKind;
  contentTypeUid: UID.ContentType;
  documentId: string;
  locale?: string;
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
