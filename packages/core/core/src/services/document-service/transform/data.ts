import { createIdMap } from './id-map';
import { extractDataIds as extractDataRelationIds } from './relations/extract/data-ids';
import { transformDataIdsVisitor as transformRelationDataIds } from './relations/transform/data-ids';

/**
 * Transforms input data, containing relation document ids, to entity ids.
 */
export const transformData = async (
  data: any,
  opts: Parameters<typeof transformRelationDataIds>[2]
) => {
  const idMap = createIdMap({ strapi });

  // Extract any relation ids from the input
  await extractDataRelationIds(idMap, data, opts);

  // Load any relation the extract methods found
  await idMap.load();

  // Transform any relation ids to entity ids
  return transformRelationDataIds(idMap, data, opts);
};
