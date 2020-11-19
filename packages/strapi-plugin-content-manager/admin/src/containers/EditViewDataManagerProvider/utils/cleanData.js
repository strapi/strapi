import { get } from 'lodash';

/* eslint-disable indent */

const cleanData = (retrievedData, currentSchema, componentsSchema) => {
  const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

  const recursiveCleanData = (data, schema) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(schema, current);
      const value = get(data, current);
      const component = getOtherInfos(schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema, [current, 'repeatable']);
      let cleanedData;

      switch (attrType) {
        case 'json':
          try {
            cleanedData = JSON.parse(value);
          } catch (err) {
            cleanedData = value;
          }

          break;
        case 'date':
        case 'datetime':
          cleanedData = value && value._isAMomentObject === true ? value.toISOString() : value;
          break;
        case 'media':
          if (getOtherInfos(schema, [current, 'multiple']) === true) {
            cleanedData = value ? value.filter(file => !(file instanceof File)) : null;
          } else {
            cleanedData = get(value, 0) instanceof File ? null : get(value, 'id', null);
          }
          break;
        case 'component':
          if (isRepeatable) {
            cleanedData = value
              ? value.map(data => {
                  const subCleanedData = recursiveCleanData(data, componentsSchema[component]);

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = value ? recursiveCleanData(value, componentsSchema[component]) : value;
          }
          break;
        case 'dynamiczone':
          cleanedData = value.map(componentData => {
            const subCleanedData = recursiveCleanData(
              componentData,
              componentsSchema[componentData.__component]
            );

            return subCleanedData;
          });
          break;
        default:
          cleanedData = value;
      }

      acc[current] = cleanedData;

      return acc;
    }, {});
  };

  return recursiveCleanData(retrievedData, currentSchema);
};

export default cleanData;
