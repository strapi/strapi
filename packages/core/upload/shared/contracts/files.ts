import { errors } from '@strapi/utils';

type SortOrder = 'ASC' | 'DESC';

type SortKey = 'createdAt' | 'name';

export interface File {
  id: number;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number;
  height?: number;
  formats?: Record<string, unknown>;
  hash: string;
  ext?: string;
  mime?: string;
  size?: number;
  sizeInBytes?: number;
  url?: string;
  previewUrl?: string;
  path?: string | null;
  provider?: string;
  provider_metadata?: Record<string, unknown>;
  isUrlSigned?: boolean;
  folder?: number;
  folderPath?: string;
  related?: {
    id: string | number;
    __type: string;
    __pivot: { field: string };
  }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  updatedBy?: number;
}

/**
 * GET /upload/files - Get files
 */
export interface RawFile extends Blob {
  size: number;
  lastModified: number;
  name: string;
  type: string;
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
      folder: number | null;
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
 * GET /upload/files/:id - Get specific file
 */
export declare namespace GetFile {
  export interface Request {
    params: { id: number };
    query: {};
  }

  export interface Response {
    data: File;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload/actions/bulk-delete - Delete Files
 */
export declare namespace BulkDeleteFiles {
  export interface Request {
    body: {
      fileIds: number[];
    };
  }

  export interface Response {
    data: {
      data: {
        files: File[];
        folders: [];
      };
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
      fileIds: number[];
      destinationFolderId: number;
    };
  }

  export interface Response {
    data: {
      data: {
        files: File[];
        folders: [];
      };
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * DELETE /upload/files/:id - Delete a specific asset
 */
export declare namespace DeleteFile {
  export interface Request {
    params: { id: number };
    query: {};
  }

  export interface Response {
    data: File;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload - Create a file
 */
export declare namespace CreateFile {
  export interface Request {
    body: FormData;
    files: File[];
  }
  export interface Response {
    data: File[];
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /upload?id=:id - Update asset
 */
export declare namespace UpdateFile {
  export interface Request {
    body: FormData;
    params: { id: number };
  }
  export interface Response {
    data: File;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}
