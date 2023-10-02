// NOTE: this function is for adding a __temp_key__ key to each object of a repeatable component
// in order to have a unique identifier for the DnD

import get from 'lodash/get';

import { getOtherInfos, getType } from './getAttributeInfos';

import type { Schema } from '@strapi/strapi';

const formatContentTypeData = <
  TSchema extends Schema.ContentType,
  TData extends Record<keyof TSchema['attributes'], unknown>
>(
  data: TData,
  ct: TSchema,
  composSchema: Record<string, Schema.Component>
) => {
  const recursiveFormatData = <
    TSchemum extends Schema.Schema,
    TDatum extends { [P in keyof TSchemum['attributes']]: unknown }
  >(
    data: TDatum,
    schema: TSchemum
  ) => {
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

      if (type === 'dynamiczone' && Array.isArray(value)) {
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

        if (isRepeatable && Array.isArray(value)) {
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
    }, {} as Record<string, unknown>);
  };

  return recursiveFormatData(data, ct);
};

export { formatContentTypeData };
