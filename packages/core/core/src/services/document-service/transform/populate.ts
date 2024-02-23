import { traverse } from '@strapi/utils';
import { type Data, type Options } from './types';
import { switchDocumentIdForId } from './utils';
import { transformFilters } from './filters';
import { transformFields } from './fields';

export const transformPopulate = async (data: Data, opts: Options) => {
  // Before doing the filters traversal change any top level 'id' properties to 'documentId'
  switchDocumentIdForId(data);

  const allKeysAreDocumentId = Object.keys(data).every((key) => key === 'documentId');
  if (allKeysAreDocumentId) {
    // If every key is a documentId, skip the traversal
    return data;
  }

  return traverse.traverseQueryPopulate(
    async ({ attribute, key, value }, { set }) => {
      if (!value || typeof value !== 'object' || attribute?.type !== 'relation') {
        return;
      }

      /*
        If the attribute is a relation
        Look for filters or fields in the value
        and apply the relevant transformation to these objects
      */
      if ('filters' in value) {
        value.filters = await transformFilters(value.filters as Data, opts);
      }

      if ('fields' in value && Array.isArray(value.fields)) {
        value.fields = transformFields(value.fields);
      }

      set(key, value);
    },
    { schema: strapi.getModel(opts.uid) },
    data
  );
};
