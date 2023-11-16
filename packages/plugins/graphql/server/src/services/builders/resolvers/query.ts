import { omit } from 'lodash/fp';
import { sanitize, validate } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  buildQueriesResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    return {
      async find(parent: any, args: any, ctx: any) {
        await validate.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });
        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.entityService!.findMany(uid, sanitizedQuery);
      },

      async findOne(parent: any, args: any, ctx: any) {
        await validate.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });
        const sanitizedQuery = await sanitize.contentAPI.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        return strapi.entityService!.findOne(uid, args.id, omit('id', sanitizedQuery));
      },
    };
  },
});
