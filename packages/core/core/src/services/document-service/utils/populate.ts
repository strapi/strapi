import type { UID } from '@strapi/types';

import { INTERNAL_CACHE_NS } from '../../caching/internal-cache-namespaces';
import { memoryCacheSync } from '../../caching/memory-cache-provider';

interface Options {
  /**
   * Fields to select when populating relations
   */
  relationalFields?: string[];
}

// We want to build a populate object based on the schema
export const getDeepPopulate = (uid: UID.Schema, opts: Options = {}) => {
  const cacheKey = `${uid}::${JSON.stringify(opts)}`;
  const cached = memoryCacheSync.get(INTERNAL_CACHE_NS.DOCUMENT_DEEP_POPULATE, cacheKey);
  if (cached?.value !== undefined && cached.value !== null) {
    return cached.value;
  }

  const model = strapi.getModel(uid);
  const attributes = Object.entries(model.attributes);

  const result = attributes.reduce((acc: any, [attributeName, attribute]) => {
    switch (attribute.type) {
      case 'relation': {
        // TODO: Support polymorphic relations
        const isMorphRelation = attribute.relation.toLowerCase().startsWith('morph');
        if (isMorphRelation) {
          break;
        }

        if ('unstable_virtual' in attribute && attribute.unstable_virtual) {
          // skip relations not managed by the DB layer
          break;
        }

        // Include all non-morph relations (including visible: false) so publish / discardDraft /
        // clone preserve links—same idea as content-manager getPopulateForRelation for invisible attrs.
        acc[attributeName] = { select: opts.relationalFields };

        break;
      }

      case 'media': {
        // We populate all media fields for completeness of webhook responses
        // see https://github.com/strapi/strapi/issues/21546
        acc[attributeName] = { select: ['*'] };
        break;
      }

      case 'component': {
        const populate = getDeepPopulate(attribute.component, opts);
        acc[attributeName] = { populate };
        break;
      }

      case 'dynamiczone': {
        // Use fragments to populate the dynamic zone components
        const populatedComponents = (attribute.components || []).reduce(
          (acc: any, componentUID: UID.Component) => {
            acc[componentUID] = { populate: getDeepPopulate(componentUID, opts) };
            return acc;
          },
          {}
        );

        acc[attributeName] = { on: populatedComponents };
        break;
      }
      default:
        break;
    }

    return acc;
  }, {});

  memoryCacheSync.set(INTERNAL_CACHE_NS.DOCUMENT_DEEP_POPULATE, cacheKey, result);
  return result;
};
