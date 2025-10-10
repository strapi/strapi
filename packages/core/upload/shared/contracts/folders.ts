import { errors } from '@strapi/utils';

export type SortOrder = 'ASC' | 'DESC';

export type SortKey = 'createdAt' | 'name' | 'updatedAt';

import type { File } from './files';

export interface FolderDefinition extends Omit<Folder, 'children' | 'files' | 'parent'> {
  children?: {
    count: number;
  };
  createdAt?: string;
  documentId?: string;
  files?: {
    count: number;
  };
  folderUrl?: string;
  isSelectable?: boolean;
  locale?: string | null;
  publishedAt?: string;
  type: string;
  updatedAt?: string;
}

export interface Folder {
  id: number;
  name: string;
  pathId?: number;
  /**
   * parent id
   */
  parent?: number | null | Folder;
  /**
   * children ids
   */
  children?: number[];
  path?: string;
  files?: File[];
}

export type FolderNode = Partial<Omit<Folder, 'children'>> & {
  children: FolderNode[];
};

type FolderNodeWithValue = Omit<FolderNode, 'children'> & {
  value: string | number | null;
  children: FolderNodeWithValue[];
};

/**
 * GET /upload/folders/:id - Get specific folder
 */
export declare namespace GetFolder {
  export interface Request {
    params: { id: number };
    query: {};
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * GET /upload/folders - Get folders
 */
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
    data: Folder[];
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload/folders - Create folders
 */
export declare namespace CreateFolders {
  export interface Request {
    body: Pick<Folder, 'name' | 'parent'>;
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.ValidationError;
  }
}

/**
 * PUT /upload/folders/:id - Update a specific folder
 */
export declare namespace UpdateFolder {
  export interface Request {
    params: { id: number };
    query: {};
    body: {
      name: string;
      parent: number | null;
    };
  }

  export interface Response {
    data: Folder;
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * GET /upload/folder-structure
 *
 * Return the structure of a folder.
 */
export declare namespace GetFolderStructure {
  export interface Request {
    query?: {};
  }

  export interface Response {
    data: {
      data: number[] & FolderNodeWithValue[];
    };
    error?: errors.ApplicationError | errors.NotFoundError;
  }
}

/**
 * POST /upload/actions/bulk-delete - Delete Folder
 */
export declare namespace BulkDeleteFolders {
  export interface Request {
    body: {
      folderIds: number[];
    };
  }

  export interface Response {
    data: {
      data: {
        files: [];
        folders: FolderDefinition[];
      };
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
      folderIds: number[];
      destinationFolderId: number;
    };
  }

  export interface Response {
    data: {
      data: {
        files: [];
        folders: Folder[];
      };
    };
    error?: errors.ApplicationError | errors.ValidationError;
  }
}
