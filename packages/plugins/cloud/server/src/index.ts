import { type Core } from '@strapi/types';

const register = async ({ strapi }: { strapi: Core.Strapi }) => {
  console.log('registering cloud plugin');
  strapi.server.use(async (ctx, next) => {
    console.log('ctx.path', ctx.path);
    await next();
  });
};
export default {
  register,
  bootstrap() {
    console.log('BOOTRSAPPING CLOUD!!!');
  },
};
