import { traverse } from '@strapi/utils';
import { transformFields } from './fields';

import { type Data, type Options } from './types';
import { switchDocumentIdForId } from './utils';

const logicalOperatorIdReplacement = (filter: Data) => {
  return Object.keys(filter).forEach((key) => {
    // If the key is a logical operator ($and, $or, $nor)
    // recursively call this function on the value of the key
    // To find any nested ids that need to be replaced
    if (key.startsWith('$')) {
      if (Array.isArray(filter[key])) {
        filter[key].forEach((item: Data) => {
          if (typeof item === 'object') {
            logicalOperatorIdReplacement(item);
          }
        });
      } else if (typeof filter[key] === 'object') {
        logicalOperatorIdReplacement(filter[key]);
      }
    } else if (key === 'id') {
      // If the key is 'id', replace it with 'documentId'
      switchDocumentIdForId(filter);
    }
  });
};

export const transformFilters = async (data: Data, opts: Options) => {
  // Before doing the filters traversal change any top level 'id' properties to 'documentId'
  switchDocumentIdForId(data);
  logicalOperatorIdReplacement(data);

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
        (Array.isArray(value) ? value : [value]).forEach((item) => {
          if (typeof item === 'object') {
            logicalOperatorIdReplacement(item as Data);
          }
        });

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
