import get from 'lodash/get';

import { getType, getOtherInfos } from './getAttributeInfos';

const defaultFields = ['createdBy', 'updatedBy', 'publishedAt', 'id', '_id'];

const contentManagementUtilRemoveFieldsFromData = (
  data,
  contentTypeSchema,
  componentSchema,
  fields = defaultFields
) => {
  const recursiveCleanData = (data, schema) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(schema, current);
      const value = get(data, current);
      const component = getOtherInfos(schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema, [current, 'repeatable']);
      let timestamps = get(schema, ['options', 'timestamps']);

      if (!Array.isArray(timestamps)) {
        timestamps = [];
      }

      if ([...fields, ...timestamps].indexOf(current) !== -1) {
        delete acc[current];

        return acc;
      }

      if (!value) {
        return acc;
      }

      if (attrType === 'dynamiczone') {
        acc[current] = value.map((componentValue) => {
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
          acc[current] = value.map((compoData) => {
            const subCleanedData = recursiveCleanData(compoData, componentSchema[component]);

            return subCleanedData;
          });
        } else {
          acc[current] = recursiveCleanData(value, componentSchema[component]);
        }

        return acc;
      }

      return acc;
    }, Object.assign({}, data));
  };

  return recursiveCleanData(data, contentTypeSchema);
};

export default contentManagementUtilRemoveFieldsFromData;
