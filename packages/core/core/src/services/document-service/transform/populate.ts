import { traverse } from '@strapi/utils';
import type { UID } from '@strapi/types';

import { type Data } from './types';
import { transformFields } from './fields';

export const transformPopulate = async (data: Data, opts: { uid: UID.Schema }) => {
  return traverse.traverseQueryPopulate(
    async ({ attribute, key, value }, { set }) => {
      if (!value || typeof value !== 'object' || attribute?.type !== 'relation') {
        return;
      }

      /*
        If the attribute is a relation
        Look for fields in the value
        and apply the relevant transformation to these objects
      */
      if ('fields' in value && Array.isArray(value.fields)) {
        value.fields = transformFields(value.fields);
      }

      set(key, value);
    },
    { schema: strapi.getModel(opts.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};
