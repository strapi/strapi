import { useGetFolderStructureQuery } from '../services/folders';
import { findFolderPath } from '../utils/findFolderPath';

/**
 * Where `currentFolderId` sits in the folder tree. `path` runs from the root
 * down to the folder, inclusive, and is `null` while the tree loads, when it
 * fails, or when it no longer holds the folder.
 */
export const useFolderTrail = (currentFolderId: number) => {
  const { data: folderStructure = [] } = useGetFolderStructureQuery();
  const path = findFolderPath(folderStructure, currentFolderId);

  return { path, ancestors: path?.slice(0, -1) ?? [] };
};
