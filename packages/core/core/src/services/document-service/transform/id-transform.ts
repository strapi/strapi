import { Strapi, Common } from '@strapi/types';

import { createIdMap } from './id-map';
import { extractDataIds as extractDataRelationIds } from './relations/extract/data-ids';
import { transformDataIdsVisitor as transformRelationDataIds } from './relations/transform/data-ids';

/** Maps document id and entity ids */
const createDocumentIdTransform = ({ strapi }: { strapi: Strapi }) => {
  const idMap = createIdMap({ strapi });

  return {
    /**
     * Transform input of a query to map document ids to entity ids.
     */
    async transformInput(
      input: { data?: any; fields?: any; filters?: any; populate?: any; sort?: any },
      opts: {
        uid: Common.UID.Schema;
        locale?: string | null;
        isDraft: boolean;
      }
    ) {
      // Data
      if (input.data) {
        await extractDataRelationIds(idMap, input.data, opts);
      }
      // Fields
      // Filters
      // Populate
      // Sort

      // Load any relation the extract methods found
      await idMap.load();

      // Data
      let data = input.data;
      if (input.data) {
        data = await transformRelationDataIds(idMap, input.data, opts);
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
        data,
        fields,
        filters,
        populate,
        sort,
      };
    },

    /**
     * Transform response of a query to map entity ids to document ids.
     */
    transformOutput(output: any) {
      return output;
    },
  };
};

export { createDocumentIdTransform };
