import { Common } from '@strapi/types';
import { traverse } from '@strapi/utils';
import { transformFields } from './fields';

export const transformFilters = async (
  data: Record<string, any>,
  opts: {
    uid: Common.UID.Schema;
    locale?: string | null;
  }
) => {
  return traverse.traverseQueryFilters(
    async ({ attribute, key, value, path, schema }, { set, remove }) => {
      if (!attribute) {
        return;
      }

      // In order to correctly ignore nested keys that are not relations
      // we keep track of the parent key within the path
      // Ensuring that the parentKey is a relation of the current schema
      // or the current schema itself
      let parentKey: string | undefined;
      if (typeof path.raw === 'string') {
        const keys = path.raw.split('.');
        parentKey = keys?.[keys.length - 2];

        // Check if parentKey is an array and remove the indexing to get the real parentKey
        if (parentKey && parentKey.endsWith(']')) {
          parentKey = parentKey.slice(0, parentKey.lastIndexOf('['));
        }
      }

      if (
        parentKey &&
        // TODO Can we rely on this match?
        ![schema?.info?.singularName, schema?.info?.pluralName].includes(parentKey) &&
        schema.attributes[parentKey]?.type !== 'relation'
      ) {
        return;
      }

      if (key === 'id') {
        remove(key);
        set('documentId', value as any);
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
