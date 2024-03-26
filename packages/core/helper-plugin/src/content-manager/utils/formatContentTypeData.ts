// NOTE: this function is for adding a __temp_key__ key to each object of a repeatable component
// in order to have a unique identifier for the DnD

import get from 'lodash/get';

import { getOtherInfos, getType } from './getAttributeInfos';

import type { Attribute, Schema } from '@strapi/types';

const formatContentTypeData = <
  TSchema extends Schema.ContentType,
  TData extends { [K in keyof TSchema['attributes']]: Attribute.GetValue<TSchema['attributes'][K]> }
>(
  data: TData,
  ct: TSchema,
  composSchema: Record<string, Schema.Component>
) => {
  const recursiveFormatData = <
    TSchemum extends Schema.Schema,
    TDatum extends {
      [P in keyof TSchemum['attributes']]: Attribute.GetValue<TSchemum['attributes'][P]>;
    }
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
        // @ts-expect-error – TODO: fix the fact we can't assign this.
        acc[current] = JSON.stringify(value, null, 2);

        return acc;
      }

      if (!value) {
        // @ts-expect-error – TODO: fix the fact we can't assign this.
        acc[current] = value;

        return acc;
      }

      if (type === 'dynamiczone' && Array.isArray(value)) {
        // @ts-expect-error – TODO: fix the fact we can't assign this.
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

        // @ts-expect-error – TODO: fix the fact we can't assign this.
        acc[current] = formattedValue;

        return acc;
      }

      // @ts-expect-error – TODO: fix the fact we can't assign this.
      acc[current] = value;

      return acc;
    }, {} as TDatum);
  };

  return recursiveFormatData(data, ct);
};

export { formatContentTypeData };
