import { get, set } from 'lodash';

const formatLayoutWithMetas = obj => {
  const formatted = obj.layouts.edit.reduce((acc, current) => {
    const row = current.map(attribute => {
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

const formatLayouts = data => {
  const formattedCTEditLayout = formatLayoutWithMetas(data.contentType);

  set(data, ['contentType', 'layouts', 'edit'], formattedCTEditLayout);

  Object.keys(data.components).forEach(compoUID => {
    const formattedCompoEditLayout = formatLayoutWithMetas(data.components[compoUID]);

    set(data, ['components', compoUID, 'layouts', 'edit'], formattedCompoEditLayout);
  });

  return data;
};

export default formatLayouts;
export { formatLayoutWithMetas };
