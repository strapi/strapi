export const remapSortlyInput = databaseOutput => {
  return databaseOutput.map(row => {
    const {
      id,
      child_order = 0,
      parent = null,
      title = '',
      state = null,
      type = null,
      page = null,
    } = row;

    return {
      id,
      index: child_order,
      parentId: parent ? parent.id : null,
      name: title,
      state: state ? state.id : null,
      type: type ? type.id : null,
      page: page ? page.id : null,
    };
  });
};

export const remapSortlyOutput = sortlyOutput => {
  return sortlyOutput.map(row => {
    const {
      id,
      index,
      parentId = null,
      state = null,
      type = null,
      page = null,
      newItem = false,
    } = row;

    return {
      id,
      child_order: index,
      parent:
        parentId === 0
          ? null
          : {
            id: parseInt(parentId, 10),
          },
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
      page:
        page === null
          ? null
          : {
            id: parseInt(page, 10),
          },
      newItem,
    };
  });
};
