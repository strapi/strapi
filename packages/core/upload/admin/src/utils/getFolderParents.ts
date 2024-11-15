import { flattenTree } from '../components/SelectTree/utils/flattenTree';

import type { FolderNode } from '../../../shared/contracts/folders';

interface FolderStructureValue extends Omit<FolderNode, 'children'> {
  value: string | number | null;
  children?: FolderStructureValue[];
}

type Parents = { id?: number | string | null; label?: string; path?: string }[];

export const getFolderParents = (folders: FolderStructureValue[], currentFolderId: number) => {
  const parents: Parents = [];
  const flatFolders = flattenTree(folders);
  const currentFolder = flatFolders.find((folder) => folder.value === currentFolderId);

  if (!currentFolder) {
    return [];
  }

  let { parent } = currentFolder;

  while (parent !== undefined) {
    // eslint-disable-next-line no-loop-func
    const parentToStore = flatFolders.find(({ value }) => value === parent);
    parents.push({ id: parentToStore?.value, label: parentToStore?.label });
    parent = parentToStore?.parent;
  }

  return parents.reverse();
};
