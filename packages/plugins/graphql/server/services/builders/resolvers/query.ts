import { StrapiCTX } from '../../../types/strapi-ctx';
import { omit } from 'lodash/fp';
import { ContentType } from '../../../types/schema';

export default ({ strapi }: StrapiCTX) => ({
  buildQueriesResolvers({ contentType }: { contentType: ContentType }) {
    const { uid } = contentType;

    return {
      async find(parent: any, args: any) {
        return strapi.entityService.findMany(uid, args);
      },

      async findOne(parent: any, args: any) {
        return strapi.entityService.findOne(uid, args.id, omit('id', args));
      },
    };
  },
});
