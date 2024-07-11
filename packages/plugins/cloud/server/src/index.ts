import { type Core } from '@strapi/types';

export default () =>
  ({
    async register({ strapi }) {
      console.log('registering cloud plugin');

      strapi.server.use(async (ctx, next) => {
        console.log('ctx.path', ctx.path);
        await next();
      });
    },
  }) as Core.Plugin;
