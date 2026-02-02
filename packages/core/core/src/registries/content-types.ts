import { pickBy, has } from 'lodash/fp';
import type { UID, Struct } from '@strapi/types';
import { createContentType, ContentTypeDefinition } from '../domain/content-type';
import { addNamespace, hasNamespace } from './namespace';

type ContentTypesInput = Record<string, ContentTypeDefinition>;
type ContentTypeExtendFn = (contentType: Struct.ContentTypeSchema) => Struct.ContentTypeSchema;

const validateKeySameToSingularName = (contentTypes: ContentTypesInput) => {
  for (const ctName of Object.keys(contentTypes)) {
    const contentType = contentTypes[ctName];

    if (ctName !== contentType.schema.info.singularName) {
      throw new Error(
        `The key of the content-type should be the same as its singularName. Found ${ctName} and ${contentType.schema.info.singularName}.`
      );
    }
  }
};

const contentTypesRegistry = () => {
  const contentTypes: Record<string, Struct.ContentTypeSchema> = {};

  return {
    /**
     * Returns this list of registered contentTypes uids
     */
    keys() {
      return Object.keys(contentTypes);
    },

    /**
     * Returns the instance of a contentType. Instantiate the contentType if not already done
     */
    get(uid: UID.ContentType) {
      return contentTypes[uid];
    },

    /**
     * Returns a map with all the contentTypes in a namespace
     */
    getAll(namespace: string) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(contentTypes);
    },

    /**
     * Registers a contentType
     */
    set(uid: UID.ContentType, contentType: Struct.ContentTypeSchema) {
      contentTypes[uid] = contentType;
      return this;
    },

    /**
     * Registers a map of contentTypes for a specific namespace
     */
    add(namespace: string, newContentTypes: ContentTypesInput) {
      validateKeySameToSingularName(newContentTypes);

      for (const rawCtName of Object.keys(newContentTypes)) {
        const uid = addNamespace(rawCtName, namespace);

        if (has(uid, contentTypes)) {
          throw new Error(`Content-type ${uid} has already been registered.`);
        }

        contentTypes[uid] = createContentType(uid, newContentTypes[rawCtName]);
      }
    },

    /**
     * Wraps a contentType to extend it
     */
    extend(ctUID: UID.ContentType, extendFn: ContentTypeExtendFn) {
      const currentContentType = this.get(ctUID);

      if (!currentContentType) {
        throw new Error(`Content-Type ${ctUID} doesn't exist`);
      }

      extendFn(currentContentType);

      return this;
    },
  };
};

export default contentTypesRegistry;
