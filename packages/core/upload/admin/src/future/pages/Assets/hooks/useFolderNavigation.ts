import { useQueryParams } from '@strapi/admin/strapi-admin';

import type { Folder } from '../../../../../../shared/contracts/folders';

export const useFolderNavigation = () => {
  const [{ query }, setQuery] = useQueryParams<{ folder?: string }>();

  const currentFolderId = query?.folder ? Number(query.folder) : null;

  const navigateToFolder = (folder: Folder) => {
    setQuery({ folder: String(folder.id) });
  };

  return {
    currentFolderId,
    navigateToFolder,
  };
};
