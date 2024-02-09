import { traverse } from '@strapi/utils';
import { transformFields } from './fields';

import { type Data, type Options } from './types';
import { switchDocumentIdForId } from './utils';

const relationalIdReplacement = (filter: Data) => {
  // If there is an id field in the filter object, replace it with documentId
  if ('id' in filter) {
    filter.documentId = filter.id;
    delete filter.id;
  }
};

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
        (Array.isArray(value) ? value : [value]).forEach((item) => {
          if (typeof item === 'object') {
            relationalIdReplacement(item as Data);
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
