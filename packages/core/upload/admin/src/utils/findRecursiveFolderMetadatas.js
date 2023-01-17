const findRecursiveFolderMetadatas = (node, searchedId, parentId = null) => {
  let result = null;

  if (node.value === parseInt(searchedId, 10)) {
    result = { parentId, currentFolderLabel: node.label };
  } else {
    for (let i = 0; i < node.children.length && !result; i++) {
      result = findRecursiveFolderMetadatas(node.children[i], searchedId, node.value);
    }
  }

  return result;
};

export default findRecursiveFolderMetadatas;
