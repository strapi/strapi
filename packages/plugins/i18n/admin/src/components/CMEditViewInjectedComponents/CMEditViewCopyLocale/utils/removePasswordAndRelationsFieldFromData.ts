import { getOtherInfos, getType } from '@strapi/helper-plugin';
import get from 'lodash/get';

const removePasswordAndRelationsFieldFromData = (
  data: any,
  contentTypeSchema: any,
  componentSchema: any
) => {
  const recursiveCleanData = (data: any, schema: any) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(schema, current);
      const value = get(data, current);
      const component = getOtherInfos(schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema, [current, 'repeatable']);

      if (attrType === 'dynamiczone') {
        acc[current] = value.map((componentValue: any) => {
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
            ? value.map((compoData: any) => {
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

      if (attrType !== 'password' && attrType !== 'relation') {
        acc[current] = value;
      }

      return acc;
    }, {} as any);
  };

  return recursiveCleanData(data, contentTypeSchema);
};

export default removePasswordAndRelationsFieldFromData;
