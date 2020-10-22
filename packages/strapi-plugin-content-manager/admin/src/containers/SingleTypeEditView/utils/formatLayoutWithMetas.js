import { get } from 'lodash';

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

export default formatLayoutWithMetas;
