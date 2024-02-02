import { traverse } from '@strapi/utils';
import { transformFields } from './fields';

import { type Data, type Options } from './types';
import { switchDocumentIdForId } from './utils';

export const transformFilters = async (data: Data, opts: Options) => {
  // Before doing the filters traversal change any top level 'id' properties to 'documentId'
  switchDocumentIdForId(data);

  return traverse.traverseQueryFilters(
    async ({ attribute, key, value }, { set }) => {
      if (!attribute || !value) {
        return;
      }

      if (attribute.type === 'relation') {
        /*
          If the attribute is a relation
          and the value is an object
          and the object contains an id field
          then we replace the value with the documentId
  
          If the value is an array of objects
          we apply the same logic to each object in the array
        */
        if (typeof value === 'object' && 'id' in value) {
          const valueWithId = value as Data;
          valueWithId.documentId = valueWithId.id;
          delete valueWithId.id;
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === 'object' && 'id' in item) {
              const itemWithId = item as Data;
              itemWithId.documentId = itemWithId.id;
              delete itemWithId.id;
            }
          });
        }

        set(key, value);
      } else if (key === 'filters') {
        set(key, await transformFilters(value as any, opts));
      } else if (key === 'fields') {
        set(key, transformFields(value as any) as any);
      }
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};
