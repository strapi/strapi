import { Common } from '@strapi/types';
import { mapAsync, pipeAsync } from '@strapi/utils';
import { isObject } from 'lodash/fp';
import { createIdMap } from './id-map';
import { extractDataIds as extractDataRelationIds } from './relations/extract/data-ids';
import { transformDataIdsVisitor as transformRelationDataIds } from './relations/transform/data-ids';
import { transformOutputIds as transformRelationOutputIds } from './relations/transform/output-ids';
import { switchIdForDocumentId } from './utils';

/**
 * Transform input of a query to map document ids to entity ids.
 */
async function transformParamsDocumentId(
  uid: Common.UID.Schema,
  input: { data?: any; fields?: any; filters?: any; populate?: any; sort?: any },
  opts: {
    locale?: string | null;
    isDraft: boolean;
  }
) {
  const idMap = createIdMap({ strapi });

  // Extract any relation ids from the input
  if (input.data) {
    await extractDataRelationIds(idMap, input.data, { ...opts, uid });
  }

  // Load any relation the extract methods found
  await idMap.load();

  // Transform any relation ids to entity ids
  let data = input.data;
  if (input.data) {
    data = await transformRelationDataIds(idMap, input.data, { ...opts, uid });
  }

  // TODO: Transform fields
  const fields = input.fields;
  // TODO: Transform filters
  const filters = input.filters;
  // TODO: Transform populate
  const populate = input.populate;
  // TODO: Transform sort
  const sort = input.sort;

  return {
    ...input,
    data,
    fields,
    filters,
    populate,
    sort,
  };
}

/**
 * Transform response of a query to map entity ids to document ids.
 */
async function transformOutputDocumentId(
  uid: Common.UID.Schema,
  output: Record<string, any> | Record<string, any>[]
) {
  if (Array.isArray(output)) {
    return mapAsync(output, (o: Record<string, any>) => transformOutputDocumentId(uid, o));
  }

  // TODO: Ensure we always have documentId on output
  if (!isObject(output) || !output?.documentId) return output;

  return pipeAsync(
    // Switch top level id -> documentId
    switchIdForDocumentId,
    // Switch relations id -> documentId
    (output) => transformRelationOutputIds(uid, output)
  )(output);
}

export { transformParamsDocumentId, transformOutputDocumentId };
