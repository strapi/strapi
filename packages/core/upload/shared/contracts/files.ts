import type { Data, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';

type SortOrder = 'ASC' | 'DESC';

type SortKey = 'createdAt' | 'name';

/**
 * GET /upload/files - Get files
 */
export interface File {
  id: Data.ID;
  documentId: Modules.Documents.ID;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: {
    thumbnail: {
      name: string;
      hash: string;
      ext: string;
      mime: string;
      path: null | string;
      width: number;
      height: number;
      size: number;
      sizeInBytes: number;
      url: string;
    } | null;
  };
  hash: string;
  ext?: string;
  mime: string;
  size: number;
  url: string;
  previewUrl?: null | string;
  provider?: string;
  provider_metadata?: null | string;
  folderPath: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  locale: string | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export declare namespace GetFiles {
  export interface Request {
    body: {};
    query: {
      page?: string;
      pageSize?: string;
      folder: Data.ID | null;
      sort?: `${SortKey}:${SortOrder}`;
    };
  }

  export interface Response {
    data: {
      results: File[];
      pagination: Pagination;
    };
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload/actions/bulk-delete - Delete Files
 */
export declare namespace BulkDeleteFiles {
  export interface Request {
    body: {
      fileIds: Data.ID[];
    };
  }

  export interface Response {
    data: {
      files: File[];
      folders: [];
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /upload/actions/bulk-move - Move Files
 */
export declare namespace BulkMoveFiles {
  export interface Request {
    body: {
      fileIds: Data.ID[];
      destinationFolderId: Data.ID;
    };
  }

  export interface Response {
    data: {
      files: File[];
      folders: [];
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * DELETE /upload/files/:id - Delete a specific asset
 */
export declare namespace DeleteFile {
  export interface Request {
    params: { id: Data.ID };
    query: {};
  }

  export interface Response {
    data: File;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}
