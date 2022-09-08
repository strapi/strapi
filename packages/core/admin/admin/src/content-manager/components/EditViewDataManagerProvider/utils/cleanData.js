import get from 'lodash/get';
import isArray from 'lodash/isArray';
import isObject from 'lodash/isObject';

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
          cleanedData = JSON.parse(value);
          break;
        case 'time': {
          cleanedData = value;

          // FIXME
          if (value && value.split(':').length < 3) {
            cleanedData = `${value}:00`;
          }

          break;
        }
        case 'media':
          if (getOtherInfos(schema, [current, 'multiple']) === true) {
            cleanedData = value ? value.filter((file) => !(file instanceof File)) : null;
          } else {
            cleanedData = get(value, 0) instanceof File ? null : get(value, 'id', null);
          }
          break;
        case 'component':
          if (isRepeatable) {
            cleanedData = value
              ? value.map((data) => {
                  const subCleanedData = recursiveCleanData(data, componentsSchema[component]);

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = value ? recursiveCleanData(value, componentsSchema[component]) : value;
          }

          break;
        case 'dynamiczone':
          cleanedData = value.map((componentData) => {
            const subCleanedData = recursiveCleanData(
              componentData,
              componentsSchema[componentData.__component]
            );

            return subCleanedData;
          });
          break;
        default:
          // The helper is mainly used for the relations in order to just send the id
          cleanedData = helperCleanData(value, 'id');
      }

      acc[current] = cleanedData;

      return acc;
    }, {});
  };

  return recursiveCleanData(retrievedData, currentSchema);
};

export const helperCleanData = (value, key) => {
  if (isArray(value)) {
    return value.map((obj) => (obj[key] ? obj[key] : obj));
  }
  if (isObject(value)) {
    return value[key];
  }

  return value;
};

export default cleanData;
