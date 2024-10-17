import { errors } from '@strapi/utils';

type SortOrder = 'ASC' | 'DESC';

type SortKey = 'createdAt' | 'name' | 'updatedAt';

// Abstract type for comparison operators where the keys are generic strings
type ComparisonOperators<T> = {
  [operator: string]: T | T[] | boolean; // Any string can be used as an operator key
};

// Abstract type for filter conditions with dynamic field names
export type FilterCondition<T> = {
  [field: string]: T | ComparisonOperators<T> | FilterCondition<T>; // Field names are dynamic and values are comparison operators
};

// Abstract type for filters where the logical operator (like $and) is a generic string
type Filters<T> = {
  [logicOperator: string]: FilterCondition<T>[]; // Logical operator key is a generic string
};

export type Query = {
  _q?: string;
  folderPath?: string;
  folder?:
    | null
    | number
    | {
        id: number;
      };
  page?:
    | string
    | number
    | {
        id: string | number;
      };
  pageSize?: string | number;
  pagination?: {
    pageSize: number;
  };
  sort?: `${SortKey}:${SortOrder}`;
  filters?: Filters<string | number | boolean>;
  state?: boolean;
};

type FileFormat = {
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
};

export interface File {
  id: number;
  name: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?:
    | Record<string, FileFormat>
    | {
        thumbnail: {
          url: string;
        };
      }
    | null;
  hash: string;
  ext?: string;
  mime?: string;
  size?: number;
  sizeInBytes?: number;
  url?: string;
  previewUrl?: string | null;
  path?: string | null;
  provider?: string;
  provider_metadata?: Record<string, unknown> | null;
  isUrlSigned?: boolean;
  folder?: number | string | null;
  folderPath?: string;
  related?: {
    id: string | number;
    __type: string;
    __pivot: { field: string };
  }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: number;
  publishedAt?: string;
  updatedBy?: number;
  isLocal?: boolean;
}

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

/**
 * GET /upload/files - Get files
 */
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
