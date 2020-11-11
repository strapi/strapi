import { get, isArray, isObject } from 'lodash';

/* eslint-disable indent */

const cleanData = (retrievedData, currentSchema, componentsSchema) => {
  const getType = (schema, attrName) => get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) => get(schema, ['attributes', ...arr], '');

  const recursiveCleanData = (data, schema) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(schema.schema, current);
      const value = get(data, current);
      const component = getOtherInfos(schema.schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema.schema, [current, 'repeatable']);
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
          if (getOtherInfos(schema.schema, [current, 'multiple']) === true) {
            cleanedData = value
              ? helperCleanData(
                  value.filter(file => !(file instanceof File)),
                  'id'
                )
              : null;
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
    return value.map(obj => (obj[key] ? obj[key] : obj));
  }
  if (isObject(value)) {
    return value[key];
  }

  return value;
};

export const cleanMongoReferenceId = obj => {
  const excludedRef = ['id', '_id', '__v'];

  if (!obj) return null;

  if (Array.isArray(obj)) {
    obj.forEach(item => cleanMongoReferenceId(item));
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'string') {
        if (excludedRef.indexOf(key) !== -1) delete obj[key];
      } else cleanMongoReferenceId(obj[key]);
    });
  }
  
return obj;
};

export default cleanData;
