import { Common } from '@strapi/types';
import { transformData } from './data';
import { transformFields } from './fields';
import { transformPopulate } from './populate';

/**
 * Transform input of a query to map document ids to entity ids.
 */
async function transformParamsDocumentId(
  uid: Common.UID.Schema,
  input: { data?: any; fields?: any; populate?: any; [key: string]: any },
  opts: {
    locale?: string | null;
    isDraft: boolean;
  }
) {
  // Transform relational documentIds to entity ids
  let data = input.data;
  if (input.data) {
    data = await transformData(input.data, { ...opts, uid });
  }

  // Make sure documentId is always present in the response
  let fields = input.fields;
  if (input.fields) {
    fields = transformFields(input.fields);
  }

  let populate = input.populate;
  if (input.populate) {
    populate = await transformPopulate(input.populate, { ...opts, uid });
  }

  return {
    ...input,
    data,
    fields,
    populate,
  };
}

export { transformParamsDocumentId };
