const findRecursiveParentFolderId = (node, searchedId, parentId = null) => {
  let result = null;

  if (node.value === Number(searchedId)) {
    result = parentId;
  } else {
    for (let i = 0; i < node.children.length && !result; i++) {
      result = findRecursiveParentFolderId(node.children[i], searchedId, node.value);
    }
  }

  return result;
};

export default findRecursiveParentFolderId;
