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
  strapi_stage?: {
    color?: string;
    name: string;
  };
}

export declare namespace GetRecentlyAssignedDocuments {
  export interface Request {
    body: {};
  }

  export interface Response {
    data: RecentDocument[];
    error?: errors.ApplicationError;
  }
}
