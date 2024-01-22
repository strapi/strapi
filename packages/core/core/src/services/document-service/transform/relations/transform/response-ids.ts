import { Schema } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';
import { isObject } from 'lodash/fp';

const mapResponseIdsToEntityIds = async (schema: Schema.Any, data: Record<string, any>) => {
  return traverseEntity(
    ({ key, value, attribute }, { set }) => {
      // Find relational attributes, and return the document ids
      if (attribute.type === 'relation') {
        // XToMany relations
        if (Array.isArray(value)) {
          set(
            key,
            // @ts-expect-error - TODO: Fix type
            value.map((document) => {
              const { id, documentId, ...rest } = document;
              return { ...rest, id: documentId };
            })
          );
        }

        // XToOne relations
        if (!isObject(value)) return;
        // If document id is in the response, switch it to be the id
        if ('id' in value && 'documentId' in value) {
          const { id, documentId, ...rest } = value;
          set(key, { ...rest, id: documentId as any });
        }
      }
    },
    { schema },
    data
  );
};

export { mapResponseIdsToEntityIds };
