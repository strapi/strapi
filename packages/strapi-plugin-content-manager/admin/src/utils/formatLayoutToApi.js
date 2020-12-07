import { omit, get } from 'lodash';

const formatLayoutToApi = ({ layouts, metadatas, ...rest }) => {
  const list = layouts.list.map(obj => {
    if (obj.name) {
      return obj.name;
    }

    return obj;
  });
  const editRelations = layouts.editRelations.map(({ name }) => name);

  const formattedRelationsMetadatas = editRelations.reduce((acc, current) => {
    const currentMetadatas = get(metadatas, [current], {});

    return {
      ...acc,
      [current]: {
        ...currentMetadatas,
        list: omit(currentMetadatas.list, ['mainField']),
      },
    };
  }, {});

  const edit = layouts.edit.map(row =>
    row.map(({ name, size }) => ({
      name,
      size,
    }))
  );

  return {
    ...rest,
    layouts: { edit, editRelations, list },
    metadatas: { ...metadatas, ...formattedRelationsMetadatas },
  };
};

export default formatLayoutToApi;
