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

export declare namespace Homepage {
  export type WidgetUID = string;
  export type Width = 4 | 6 | 8 | 12;

  export interface Layout {
    version: number;
    widgets: Array<{
      uid: WidgetUID;
      width: Width;
    }>;
    updatedAt: string;
  }

  export interface LayoutWrite {
    widgets: Array<{
      uid: WidgetUID;
      width: Width;
    }>;
  }
}

export declare namespace GetHomepageLayout {
  export interface Response {
    data: Homepage.Layout;
  }
}

export declare namespace UpdateHomepageLayout {
  export interface Request {
    body: Homepage.LayoutWrite;
  }

  export interface Response {
    data: Homepage.Layout;
  }
}
