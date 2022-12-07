import { pick } from 'lodash/fp';
import { ContentType } from '../../../types/schema';
import { StrapiCTX } from '../../../types/strapi-ctx';

const pickCreateArgs = pick(['params', 'data', 'files']);

export default ({ strapi }: StrapiCTX) => ({
  buildMutationsResolvers({ contentType }: { contentType: ContentType }) {
    const { uid } = contentType;

    return {
      async create(parent: any, args: any) {
        // todo[v4]: Might be interesting to generate dynamic yup schema to validate payloads with more complex checks (on top of graphql validation)
        const params = pickCreateArgs(args);

        // todo[v4]: Sanitize args to only keep params / data / files (or do it in the base resolver)
        return strapi.entityService.create(uid, params);
      },

      async update(parent: any, args: any) {
        const { id, data } = args;

        return strapi.entityService.update(uid, id, { data });
      },

      async delete(parent: any, args: any) {
        const { id, ...rest } = args;

        return strapi.entityService.delete(uid, id, rest);
      },
    };
  },
});
