import { get } from 'lodash';

const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

const removePasswordFieldsFromData = (data, contentTypeSchema, componentSchema) => {
  const recursiveCleanData = (data, schema) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(schema.schema, current);
      const value = get(data, current);
      const component = getOtherInfos(schema.schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema.schema, [current, 'repeatable']);

      if (attrType === 'dynamiczone') {
        acc[current] = value.map(componentValue => {
          const subCleanedData = recursiveCleanData(
            componentValue,
            componentSchema[componentValue.__component]
          );

          return subCleanedData;
        });

        return acc;
      }

      if (attrType === 'component') {
        if (isRepeatable) {
          /* eslint-disable indent */
          acc[current] = value
            ? value.map(compoData => {
                const subCleanedData = recursiveCleanData(compoData, componentSchema[component]);

                return subCleanedData;
              })
            : value;
          /* eslint-enable indent */
        } else {
          acc[current] = value ? recursiveCleanData(value, componentSchema[component]) : value;
        }

        return acc;
      }

      if (attrType !== 'password') {
        acc[current] = value;
      }

      return acc;
    }, {});
  };

  return recursiveCleanData(data, contentTypeSchema);
};

export default removePasswordFieldsFromData;
export { getType, getOtherInfos };
