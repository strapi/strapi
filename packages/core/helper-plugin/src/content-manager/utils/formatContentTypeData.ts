// NOTE: this function is for adding a __temp_key__ key to each object of a repeatable component
// in order to have a unique identifier for the DnD

import get from 'lodash/get';

import { getOtherInfos, getType } from './getAttributeInfos';

interface ComponentSchema {
  [key: string]: any;
}

interface DataObject {
  [key: string]: any;
}

const formatContentTypeData = (
  data: DataObject,
  ct: ComponentSchema,
  composSchema: Record<string, ComponentSchema>
): DataObject => {
  const recursiveFormatData = (data: DataObject, schema: ComponentSchema) => {
    return Object.keys(data).reduce((acc: DataObject, current: string) => {
      const type = getType(schema, current);
      const value = get(data, current);
      const compoUid = getOtherInfos(schema, [current, 'component']);
      const isRepeatable = getOtherInfos(schema, [current, 'repeatable']);

      if (type === 'json' && value !== undefined) {
        acc[current] = JSON.stringify(value, null, 2);

        return acc;
      }

      if (!value) {
        acc[current] = value;

        return acc;
      }

      if (type === 'dynamiczone') {
        acc[current] = value.map((componentValue: DataObject) => {
          const formattedData = recursiveFormatData(
            componentValue,
            composSchema[componentValue.__component]
          );

          return formattedData;
        });

        return acc;
      }

      if (type === 'component') {
        let formattedValue: any;

        if (isRepeatable) {
          formattedValue = value.map((obj: DataObject, i: number) => {
            const newObj = { ...obj, __temp_key__: i };

            return recursiveFormatData(newObj, composSchema[compoUid]);
          });
        } else {
          formattedValue = recursiveFormatData(value, composSchema[compoUid]);
        }

        acc[current] = formattedValue;

        return acc;
      }

      acc[current] = value;

      return acc;
    }, {});
  };

  return recursiveFormatData(data, ct);
};

export { formatContentTypeData };
