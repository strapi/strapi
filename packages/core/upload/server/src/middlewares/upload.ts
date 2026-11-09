import range from 'koa-range';
import koaStatic from 'koa-static';

import type { Core } from '@strapi/types';

/**
 * Programmatic upload middleware. We do not want to expose it in the plugin
 */
export default ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.server.app.on('error', (err) => {
    if (err.code === 'EPIPE') {
      // when serving audio or video the browsers sometimes close the connection to go to range requests instead.
      // This causes koa to emit a write EPIPE error. We can ignore it.
      // Right now this ignores it globally and we cannot do much more because it is how koa handles it.
      return;
    }

    strapi.server.app.onerror(err);
  });

  const localServerConfig = strapi.config.get('plugin::upload.providerOptions.localServer', {});

  strapi.server.routes([
    {
      method: 'GET',
      path: '/uploads/(.*)',
      // Kept in v6 syntax so ctx.params[0] and the API documentation stay as they were.
      [Symbol.for('strapi.route.keepV6Path')]: true,
      handler: [range, koaStatic(strapi.dirs.static.public, { defer: true, ...localServerConfig })],
      config: { auth: false },
    },
  ]);
};
