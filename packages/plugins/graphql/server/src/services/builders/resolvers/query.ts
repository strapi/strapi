import { omit } from 'lodash/fp';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => ({
  buildQueriesResolvers({ contentType }: { contentType: Schema.ContentType }) {
    const { uid } = contentType;

    return {
      async findMany(parent: any, args: any, ctx: any) {
        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        // Store the root query args in context so they can be accessed deeply down the tree (dz, components, etc..)
        ctx.rootQueryArgs = args;

        return strapi.documents!(uid).findMany({ status: 'published', ...sanitizedQuery });
      },

      async findFirst(parent: any, args: any, ctx: any) {
        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        // Store the root query args in context so they can be accessed deeply down the tree (dz, components, etc..)
        ctx.rootQueryArgs = args;

        return strapi.documents!(uid).findFirst({ status: 'published', ...sanitizedQuery });
      },

      async findOne(parent: any, args: any, ctx: any) {
        const { documentId } = args;

        await strapi.contentAPI.validate.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        const sanitizedQuery = await strapi.contentAPI.sanitize.query(args, contentType, {
          auth: ctx?.state?.auth,
        });

        // Store the root query args in context so they can be accessed deeply down the tree (dz, components, etc..)
        ctx.rootQueryArgs = args;

        return strapi.documents!(uid).findOne({
          status: 'published',
          ...omit(['id', 'documentId'], sanitizedQuery),
          documentId,
        });
      },
    };
  },
});
