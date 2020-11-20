const formatLayoutToApi = ({ layouts, ...rest }) => {
  const list = layouts.list.map(obj => {
    if (obj.name) {
      return obj.name;
    }

    return obj;
  });
  const editRelations = layouts.editRelations.map(({ name }) => name);
  const edit = layouts.edit.map(row =>
    row.map(({ name, size }) => ({
      name,
      size,
    }))
  );

  return { ...rest, layouts: { edit, editRelations, list } };
};

export default formatLayoutToApi;
