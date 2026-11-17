import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    // The browser only reads a cross-origin response when the origin is allowed here. Cookies need
    // `credentials` (it sends `Access-Control-Allow-Credentials`) and an exact origin, never `*`.
    // The default `Authorization` header is what lets Bearer mode through the preflight.
    name: 'strapi::cors',
    config: {
      origin: env.array('FRONTEND_URL', ['http://localhost:5173']),
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
