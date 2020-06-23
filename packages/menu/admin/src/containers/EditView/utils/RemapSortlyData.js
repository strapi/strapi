export const remapSortlyInput = databaseOutput => {
  return databaseOutput.map(row => {
    const { id, child_order = 0, parent = null, title = '', state = null, type = null } = row;

    return {
      id,
      index: child_order,
      parentId: parent ? parent.id : null,
      name: title,
      state: state ? state.id : null,
      type: type ? type.id : null,
    };
  });
};

export const remapSortlyOutput = sortlyOutput => {
  return sortlyOutput.map(row => {
    const { id, index, parentId = null, name, state = null, type = null, newItem = false } = row;

    return {
      id,
      child_order: index,
      parent:
        parentId === 0
          ? null
          : {
            id: parseInt(parentId, 10),
          },
      title: name,
      menu_type:
        type === null
          ? null
          : {
            id: parseInt(type, 10),
          },
      menu_state:
        state === null
          ? null
          : {
            id: parseInt(state, 10),
          },
      newItem,
    };
  });
};
