import flattenTree from '../components/SelectTree/utils/flattenTree';

const getFolderParents = (folders, currentFolderId) => {
  const parents = [];
  const flatFolders = flattenTree(folders);
  const currentFolder = flatFolders.find(folder => folder.value === currentFolderId);

  let { parent } = currentFolder || {};

  while (parent !== undefined) {
    // eslint-disable-next-line no-loop-func
    let parentToStore = flatFolders.find(({ value }) => value === parent);
    parents.push({ id: parentToStore.value, label: parentToStore.label });
    parent = parentToStore.parent;
  }

  return parents.reverse();
};

export default getFolderParents;
