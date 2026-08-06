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

interface FolderNavigationQuery {
  folder?: string;
  _q?: string;
}

export const useFolderNavigation = () => {
  const [{ query }, setQuery] = useQueryParams<FolderNavigationQuery>();

  const currentFolderId = parseFolderIdFromQuery(query?.folder);

  /**
   * Asset search is global, so keeping `_q` after a folder navigation would show
   * byte-identical results and make the navigation look broken. Clearing it here
   * — rather than at each call site — means no caller can forget.
   */
  const navigateToFolder = useCallback(
    (folder: Folder) => {
      setQuery({ folder: String(folder.id), _q: undefined });
    },
    [setQuery]
  );

  /**
   * Move to the Media Library root by removing the `folder` query param, and the
   * search term with it. `setQuery(_, 'remove')` deletes the keys present on the
   * first argument (values are ignored) in one navigation, so any other query
   * state (pagination, the details drawer, etc.) is preserved.
   */
  const navigateToRoot = useCallback(() => {
    setQuery({ folder: '', _q: '' }, 'remove');
  }, [setQuery]);

  /**
   * Strips a `?folder=` value we can't parse.
   */
  const stripFolderParam = useCallback(() => {
    setQuery({ folder: '' }, 'remove');
  }, [setQuery]);

  // Malformed ?folder= values (e.g. abc) parse as null; strip the param from the URL.
  // Deleted/missing folders (404) are handled in AssetsPage — that needs a fetch.
  useEffect(() => {
    if (query?.folder && currentFolderId === null) {
      stripFolderParam();
    }
  }, [query?.folder, currentFolderId, stripFolderParam]);

  /**
   * Convenience for the FolderTree sidebar: a single entry point that handles
   * both "go home" and "go to folder X" without forcing the caller to know
   * whether to call navigateToFolder or navigateToRoot.
   */
  const navigateToFolderId = useCallback(
    (folderId: number | null) => {
      if (folderId == null) {
        navigateToRoot();
      } else {
        setQuery({ folder: String(folderId), _q: undefined });
      }
    },
    [navigateToRoot, setQuery]
  );

  return {
    currentFolderId,
    navigateToFolder,
    navigateToRoot,
    navigateToFolderId,
  };
};
