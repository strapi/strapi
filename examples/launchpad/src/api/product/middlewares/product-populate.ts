/**
 * `product-populate` middleware
 */
import type { Core } from '@strapi/strapi';

const populate = {
  perks: true,
  images: true,
  dynamic_zone: {
    on: {
      'dynamic-zone.related-products': {
        populate: {
          products: {
            populate: {
              images: true,
            },
          },
        },
      },
    },
  },
  categories: {
    populate: {
      product: true,
      articles: {
        populate: {
          dynamic_zone: {
            on: {
              'dynamic-zone.related-articles': true,
              'dynamic-zone.cta': {
                populate: {
                  CTAs: true,
                },
              },
            },
          },
        },
      },
    },
  },
  plans: {
    populate: {
      perks: true,
      CTA: true,
      product: true,
    },
  },
};

export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    ctx.query.populate = populate;
    await next();
  };
};
