import { curry } from 'lodash/fp';

import { UID, Modules } from '@strapi/types';

import { transformData } from './data';
import { transformFields } from './fields';
import { transformPopulate } from './populate';

/**
 * Transform input of a query to map document ids to entity ids.
 */
async function transformParamsDocumentId(
  uid: UID.Schema,
  query: Modules.Documents.Params.All
): Promise<Modules.Documents.Params.All> {
  // Transform relational documentIds to entity ids
  let data = query.data;
  if (query.data) {
    data = await transformData(query.data, {
      locale: query.locale,
      status: query.status,
      uid,
    });
  }

  // Make sure documentId is always present in the response
  let fields = query.fields;
  if (query.fields) {
    fields = transformFields(query.fields) as typeof query.fields;
  }

  let populate = query.populate;
  if (query.populate) {
    populate = (await transformPopulate(query.populate, { uid })) as typeof query.populate;
  }

  return {
    ...query,
    data,
    fields,
    populate,
  };
}

const curriedTransformParamsDocumentId = curry(transformParamsDocumentId);

export { curriedTransformParamsDocumentId as transformParamsDocumentId };
