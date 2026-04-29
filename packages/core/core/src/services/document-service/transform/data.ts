import { createIdMap } from './id-map';
import { extractDataIds as extractDataRelationIds } from './relations/extract/data-ids';
import { transformDataIdsVisitor as transformRelationDataIds } from './relations/transform/data-ids';
import { setDefaultLocaleToRelations } from './relations/transform/default-locale';

/**
 * Transforms input data, containing relation document ids, to entity ids.
 */
export const transformData = async (data: any, opts: any) => {
  // Store cache on request state so repeated calls in one request can reuse it
  const requestState = strapi.requestContext?.get?.()?.state as
    | { __documentServiceIdMap?: ReturnType<typeof createIdMap> }
    | undefined;

  if (requestState && !requestState.__documentServiceIdMap) {
    requestState.__documentServiceIdMap = createIdMap({ strapi });
  }

  const idMap = requestState?.__documentServiceIdMap ?? createIdMap({ strapi });

  // Assign default locales
  const transformedData = await setDefaultLocaleToRelations(data, opts.uid);

  // Extract any relation ids from the input
  await extractDataRelationIds(idMap, transformedData, opts);

  // Load any relation the extract methods found
  await idMap.load();

  // Transform any relation ids to entity ids
  return transformRelationDataIds(idMap, transformedData, opts);
};
