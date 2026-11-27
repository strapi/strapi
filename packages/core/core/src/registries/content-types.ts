import { has, pickBy } from 'lodash';
import type { Core, UID, Struct } from '@strapi/types';
import { createContentType, ContentTypeDefinition } from '../domain/content-type';
import { warnLateRegistration } from '../utils/late-registration';
import { areDatabaseModelsBuilt, databaseModelsWindow } from './database-models';
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

const contentTypesRegistry = (strapi: Core.Strapi) => {
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
      return pickBy(contentTypes, (_, uid) => hasNamespace(uid, namespace));
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

        if (has(contentTypes, uid)) {
          throw new Error(`Content-type ${uid} has already been registered.`);
        }

        contentTypes[uid] = createContentType(uid, newContentTypes[rawCtName]);

        if (areDatabaseModelsBuilt(strapi) === true) {
          warnLateRegistration(strapi, {
            ...databaseModelsWindow,
            surface: 'content-types',
            key: uid,
            subject: `Content type "${uid}"`,
            effect: `the registry lists it, but the database does not know it, so Strapi creates no table for it and its queries throw "Model ${uid} not found"`,
          });
        }
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

      if (areDatabaseModelsBuilt(strapi) === true) {
        warnLateRegistration(strapi, {
          ...databaseModelsWindow,
          surface: 'content-types.extend',
          key: ctUID,
          subject: `Change to content type "${ctUID}"`,
          effect:
            'the registry has the changed schema, but the database keeps the previous one, so Strapi creates no column for a new attribute and queries that use it fail',
        });
      }

      return this;
    },
  };
};

export default contentTypesRegistry;
