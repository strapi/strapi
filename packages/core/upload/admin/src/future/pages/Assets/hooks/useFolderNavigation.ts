import { useCallback, useEffect } from 'react';

import { useQueryParams } from '@strapi/admin/strapi-admin';

import type { Folder } from '../../../../../../shared/contracts/folders';

const parseFolderIdFromQuery = (folder: string | undefined): number | null => {
  if (!folder) {
    return null;
  }

  const id = Number(folder);

  return Number.isFinite(id) ? id : null;
};

export const useFolderNavigation = () => {
  const [{ query }, setQuery] = useQueryParams<{ folder?: string }>();

  const currentFolderId = parseFolderIdFromQuery(query?.folder);

  const navigateToFolder = (folder: Folder) => {
    setQuery({ folder: String(folder.id) });
  };

  /**
   * Move to the Media Library root by removing the `folder` query param.
   * `setQuery(_, 'remove')` deletes the keys present on the first argument
   * (value is ignored), so any other query state (filters, pagination, etc.)
   * is preserved.
   */
  const navigateToRoot = useCallback(() => {
    setQuery({ folder: '' }, 'remove');
  }, [setQuery]);

  useEffect(() => {
    if (query?.folder && currentFolderId === null) {
      navigateToRoot();
    }
  }, [query?.folder, currentFolderId, navigateToRoot]);

  /**
   * Convenience for the FolderTree sidebar: a single entry point that handles
   * both "go home" and "go to folder X" without forcing the caller to know
   * whether to call navigateToFolder or navigateToRoot.
   */
  const navigateToFolderId = (folderId: number | null) => {
    if (folderId == null) {
      navigateToRoot();
    } else {
      setQuery({ folder: String(folderId) });
    }
  };

  return {
    currentFolderId,
    navigateToFolder,
    navigateToRoot,
    navigateToFolderId,
  };
};
