export const remapSortlyInput = databaseOutput => {
  return databaseOutput.map(row => {
    const { id, child_order = 0, parent = 0, title = '' } = row;

    return {
      id,
      index: child_order,
      parentId: parent,
      name: title,
    };
  });
};

export const remapSortlyOutput = sortlyOutput => {
  return sortlyOutput.map(row => {
    const { id, index, parentId = null, name } = row;

    return {
      id,
      child_order: index,
      parent: parentId === 0 ? null : parentId,
      title: name,
    };
  });
};
