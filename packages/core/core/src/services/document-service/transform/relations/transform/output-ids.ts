import { Public } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { isObject } from 'lodash/fp';
import { switchIdForDocumentId } from '../../utils';

const transformOutputIds = async (uid: Public.UID.Schema, output: Record<string, any>) => {
  return traverseEntity(
    ({ key, value, attribute }, { set }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        // XToMany relations
        if (Array.isArray(value)) {
          // @ts-expect-error - TODO: Fix type
          set(key, value.map(switchIdForDocumentId));
          return;
        }

        if (!isObject(value)) return;
        // XToOne relations
        // If document id is in the response, switch it to be the id
        if ('id' in value && 'documentId' in value) {
          set(key, switchIdForDocumentId(value));
        }
      }
    },
    { schema: strapi.getModel(uid) },
    output
  );
};

export { transformOutputIds };
