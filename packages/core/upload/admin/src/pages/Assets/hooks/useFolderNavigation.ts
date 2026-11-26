import { useCallback, useEffect } from 'react';

import { withEncodedUserParams } from '@strapi/admin/strapi-admin';

import { useListQueryParams } from './useListQueryParams';

import type { Folder } from '../../../../../shared/contracts/folders';

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
  searchAll?: string;
}

export const useFolderNavigation = () => {
  const [{ query }, setQuery] = useListQueryParams<FolderNavigationQuery>();

  const currentFolderId = parseFolderIdFromQuery(query?.folder);

  /**
   * Opening a folder starts a fresh search there: the term and the "Search all
   * media" switch are cleared. Clearing them here — rather than at each call
   * site — means no caller can forget.
   */
  const navigateToFolder = useCallback(
    (folder: Folder) => {
      setQuery({ folder: String(folder.id), _q: undefined, searchAll: undefined });
    },
    [setQuery]
  );

  /**
   * Move to the Media Library root by removing the `folder` query param, and the
   * search term and switch with it. `setQuery(_, 'remove')` deletes the keys present on the
   * first argument (values are ignored) in one navigation, so any other query
   * state (pagination, the details drawer, etc.) is preserved.
   */
  const navigateToRoot = useCallback(() => {
    setQuery({ folder: '', _q: '', searchAll: '' }, 'remove');
  }, [setQuery]);

  /**
   * Strips a `?folder=` value we can't parse.
   */
  const stripFolderParam = useCallback(() => {
    setQuery(withEncodedUserParams(query, { folder: undefined }));
  }, [query, setQuery]);

  // Malformed ?folder= values (e.g. abc) parse as null; strip the param from the URL.
  // Deleted/missing folders (404) are handled in useAssetsList — that needs a fetch.
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
        setQuery({ folder: String(folderId), _q: undefined, searchAll: undefined });
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
