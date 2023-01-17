// NOTE: this function is for adding a __temp_key__ key to each object of a repeatable component
// in order to have a unique identifier for the DnD

import get from 'lodash/get';
import { getType, getOtherInfos } from './getAttributeInfos';

const formatContentTypeData = (data, ct, composSchema) => {
  const recursiveFormatData = (data, schema) => {
    return Object.keys(data).reduce((acc, current) => {
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
        acc[current] = value.map((componentValue) => {
          const formattedData = recursiveFormatData(
            componentValue,
            composSchema[componentValue.__component]
          );

          return formattedData;
        });

        return acc;
      }

      if (type === 'component') {
        let formattedValue;

        if (isRepeatable) {
          formattedValue = value.map((obj, i) => {
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

export default formatContentTypeData;
