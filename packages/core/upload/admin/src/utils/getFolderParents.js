const buildRecursiveFolderParents = (results, node, searchedId) => {
  let found = false;

  if (node.value === parseInt(searchedId, 10)) {
    found = true;
  } else {
    for (let i = 0; i < node.children.length && !found; i++) {
      found = buildRecursiveFolderParents(results, node.children[i], searchedId);

      if (found) {
        results.push({ id: node.children[i].value, label: node.children[i].label });
      }
    }
  }

  return found;
};

const getFolderParents = (folderNode, folder) => {
  const results = [];

  if (folderNode && folder) {
    buildRecursiveFolderParents(results, folderNode, folder);
  }

  return results.reverse();
};

export default getFolderParents;
