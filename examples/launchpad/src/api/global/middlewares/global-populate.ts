/**
 * `global-populate` middleware
 */
import type { Core } from '@strapi/strapi';

const populate = {
  navbar: {
    populate: {
      left_navbar_items: true,
      right_navbar_items: true,
      logo: {
        populate: {
          image: true,
        },
      },
    },
  },
  footer: {
    populate: {
      internal_links: true,
      policy_links: true,
      social_media_links: true,
      logo: {
        populate: {
          image: true,
        },
      },
    },
  },
  seo: {
    populate: {
      metaImage: true,
    },
  },
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    ctx.query.populate = populate;
    await next();
  };
};
