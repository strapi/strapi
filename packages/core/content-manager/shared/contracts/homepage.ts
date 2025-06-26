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
  [key: string]: any;
}

export declare namespace GetRecentDocuments {
  export interface Request {
    body: {};
    query: {
      action: 'update' | 'publish' | 'assigned';
    };
  }

  export interface Response {
    data: RecentDocument[];
    error?: errors.ApplicationError;
  }
}
