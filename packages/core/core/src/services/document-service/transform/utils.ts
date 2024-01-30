import { Common } from '@strapi/types';
import { IdMap } from './id-map';

export const switchIdForDocumentId = (output: Record<string, any>) => {
  // Mutating for performance reasons
  const documentId = output.documentId;
  delete output.documentId;
  output.id = documentId;
  return output;
};

export const transformFields = (fields: string[]): string[] => {
  return fields.map((field) => (field === 'id' ? 'documentId' : field));
};

export const transformSort = (sort: string[] | string): string[] | string => {
  if (Array.isArray(sort)) {
    return sort.map((item) => (item === 'id' ? 'documentId' : item));
  }
  return sort.replace('id', 'documentId');
};

export const transformFiltersOrPopulate = (
  idMap: IdMap,
  obj: Record<string, any>,
  opts: { uid: Common.UID.Schema; locale?: string | null; isDraft: boolean }
): Record<string, any> => {
  const transformedObj: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    if (key === 'id') {
      transformedObj.documentId = obj[key];
    } else if (['filters', 'populate'].includes(key)) {
      transformedObj[key] = transformFiltersOrPopulate(idMap, obj[key], opts);
    } else if (key === 'fields') {
      transformedObj[key] = transformFields(obj[key]);
    } else {
      const attribute = strapi.getModel(opts.uid).attributes[key];

      if (attribute && attribute.type === 'relation') {
        // For relational attributes, use idMap to transform the ids
        if (Array.isArray(obj[key])) {
          // @ts-expect-error TODO ensure that entry is an object ??
          transformedObj[key] = obj[key].map((entry) =>
            transformFiltersOrPopulate(idMap, entry, {
              ...opts,
              // @ts-expect-error TODO TS
              uid: attribute.target,
            })
          );
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          transformedObj[key] = transformFiltersOrPopulate(idMap, obj[key], {
            ...opts,
            // @ts-expect-error TODO TS
            uid: attribute.target,
          });
        } else if (typeof obj[key] === 'string') {
          // @ts-expect-error TODO TS
          const entryId = idMap.get(attribute.target, obj[key], opts.locale);
          if (entryId) {
            transformedObj[key] = entryId;
          }
        }
      }
      // TODO:
      // else if (typeof obj[key] === 'object' && obj[key] !== null) {
      // transformedObj[key] = transformFiltersOrPopulate(idMap, obj[key], opts);
      // }
      // Non-relational attributes are handled normally
      else {
        transformedObj[key] = obj[key];
      }
    }
  }

  return transformedObj;
};
