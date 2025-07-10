import { Core } from '@strapi/strapi';

const config: Core.Config.Shared.ConfigExport<Core.Config.Server> = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
});

export default config;
