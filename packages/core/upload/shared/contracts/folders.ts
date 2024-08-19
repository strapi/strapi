import type { Data, Modules } from '@strapi/types';
import { errors } from '@strapi/utils';

export type SortOrder = 'ASC' | 'DESC';

export type SortKey = 'createdAt' | 'name';

export interface FolderStructure {
  value?: number | null;
  id?: Data.ID;
  name?: string;
  label?: string;
  children?: [] | FolderStructure | FolderStructure[];
}

/**
 * GET /upload/folder-structure
 *
 * Return the structure of a folder.
 */
export declare namespace FolderStructure {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: FolderStructure[];
  }
}

/**
 * GET /upload/folders - Get folders
 */
export interface Folder {
  name: string;
  id: Data.ID;
  documentId: Modules.Documents.ID;
  pathId: Data.ID;
  path: `/${Data.ID}`;
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
  publishedAt: string | null;
  locale: string | null;
  children?: {
    count: number;
  };
  files?: {
    count: number;
  };
}

export interface FolderEnriched extends Folder {
  isSelectable?: boolean;
  folderURL?: string;
  type: string;
}

export declare namespace GetFolders {
  export interface Request {
    body: {};
    query: {
      page?: string;
      pageSize?: string;
      sort?: `${SortKey}:${SortOrder}`;
    };
  }

  export interface Response {
    data: Folder[] | [];
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload/folders - Create folders
 */
export declare namespace CreateFolders {
  export interface Request {
    body: {
      name: string;
      parentId: Data.ID | null;
    };
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /upload/actions/bulk-delete - Delete Folder
 */
export declare namespace BulkDeleteFolders {
  export interface Request {
    body: {
      folderIds: Data.ID[];
    };
  }

  export interface Response {
    data: {
      files: [];
      folders: Folder[];
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * POST /upload/actions/bulk-move - Move Folder
 */
export declare namespace BulkMoveFolders {
  export interface Request {
    body: {
      folderIds: Data.ID[];
      destinationFolderId: Data.ID;
    };
  }

  export interface Response {
    data: {
      files: [];
      folders: Folder[];
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * GET /upload/folders/:id - Get specific folder
 */
export declare namespace GetFolder {
  export interface Request {
    params: { id: Data.ID };
    query: {};
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * PUT /upload/folders/:id - Update a specific folder
 */
export declare namespace UpdateFolder {
  export interface Request {
    params: { id: Data.ID };
    query: {};
    body: {
      name: string;
      parent: Data.ID | null;
    };
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}
