import type { Data, Modules } from '@strapi/types';
import type { Folder } from './folders';
import { errors } from '@strapi/utils';

type SortOrder = 'ASC' | 'DESC';

type SortKey = 'createdAt' | 'name';

/**
 * GET /upload/files - Get files
 */
export interface Asset {
  id: Data.ID;
  height?: number | null;
  width?: number | null;
  size: number;
  createdAt: string;
  ext?: string;
  mime: string | null;
  name: string;
  url: string;
  updatedAt: string;
  alternativeText?: string | null;
  caption?: string | null;
  folder: null | Pick<
    Folder,
    | 'createdAt'
    | 'documentId'
    | 'id'
    | 'locale'
    | 'name'
    | 'path'
    | 'pathId'
    | 'publishedAt'
    | 'updatedAt'
  >;
  documentId: Modules.Documents.ID;
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
    small?: {
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
    medium?: {
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
    large?: {
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
  } | null;
  hash: string;
  previewUrl?: null | string;
  provider: string;
  provider_metadata?: null | string;
  folderPath: string;
  publishedAt?: string | null;
  locale: string | null;
  isUrlSigned?: boolean;
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
      results: Asset[];
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
      files: Asset[];
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
      files: Asset[];
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
    data: Asset;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}
