import { get, set } from 'lodash';

const formatLayoutWithMetas = obj => {
  const formatted = obj.layouts.edit.reduce((acc, current) => {
    const row = current.map(attribute => {
      // TODO handle relations endpoint....
      return {
        ...attribute,
        fieldSchema: get(obj, ['schema', 'attributes', attribute.name], {}),
        metadatas: get(obj, ['metadatas', attribute.name, 'edit'], {}),
      };
    });

    acc.push(row);

    return acc;
  }, []);

  return formatted;
};

// editRelations is an array of strings...
const formatEditRelationsLayoutWithMetas = obj => {
  const formatted = obj.layouts.editRelations.reduce((acc, current) => {
    const fieldSchema = get(obj, ['schema', 'attributes', current], {});
    const metadatas = get(obj, ['metadatas', current, 'edit'], {});
    const size = 6;

    acc.push({
      name: current,
      size,
      fieldSchema,
      metadatas,
    });

    return acc;
  }, []);

  return formatted;
};

const formatLayouts = data => {
  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType);
  const formattedEditRelationsLayout = formatEditRelationsLayoutWithMetas(data.contentType);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);
  set(data, ['contentType', 'layouts', 'editRelations'], formattedEditRelationsLayout);

  Object.keys(data.components).forEach(compoUID => {
    const formattedCompoEditLayout = formatLayoutWithMetas(data.components[compoUID]);

    set(data, ['components', compoUID, 'layouts', 'edit'], formattedCompoEditLayout);
  });

  return data;
};

export default formatLayouts;
export { formatEditRelationsLayoutWithMetas, formatLayoutWithMetas };
