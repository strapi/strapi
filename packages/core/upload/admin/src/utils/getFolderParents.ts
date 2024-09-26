import flattenTree from '../components/SelectTree/utils/flattenTree';

import type { FolderNode } from '../../../shared/contracts/folders';

interface FolderStructureValue extends Omit<FolderNode, 'children'> {
  value: number | null;
  children?: FolderStructureValue[];
}

export const getFolderParents = (folders: FolderStructureValue[], currentFolderId: number) => {
  const parents = [];
  const flatFolders = flattenTree(folders);
  const currentFolder = flatFolders.find((folder) => folder.value === currentFolderId);

  if (!currentFolder) {
    return [];
  }

  let { parent } = currentFolder;

  while (parent !== undefined) {
    // eslint-disable-next-line no-loop-func
    let parentToStore = flatFolders.find(({ value }) => value === parent);
    parents.push({ id: parentToStore?.value, label: parentToStore?.label });
    parent = parentToStore?.parent;
  }

  return parents.reverse();
};
