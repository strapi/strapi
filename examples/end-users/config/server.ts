import type { Core } from '@strapi/strapi';

const serverConfig = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  // The server's public address. The plugin builds every absolute URL (cookies, redirects, links
  // in emails) on it. Left unset it falls back to the address Strapi derives from `host` and
  // `port`, and logs a warning in production.
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS', ['toBeModified1', 'toBeModified2']),
  },
});

export default serverConfig;
