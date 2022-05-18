const findRecursiveParentFolderId = (node, searchedId, parentId = -1) => {
  let result = -1;

  if (node.value === Number(searchedId)) {
    result = parentId;
  } else {
    for (let i = 0; i < node.children.length && result === -1; i++) {
      result = findRecursiveParentFolderId(node.children[i], searchedId, node.value);
    }
  }

  return result === -1 ? null : result;
};

export default findRecursiveParentFolderId;
