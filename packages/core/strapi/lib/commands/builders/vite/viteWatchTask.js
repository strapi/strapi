'use strict';

const { createServer } = require('vite');
const { resolveViteConfig } = require('./resolveViteConfig');

/**
 * @typedef ViteWatchTask
 */

/**
 * @type {(ctx: import('../strapi-client').BuildContext, task: ViteWatchTask) => Promise<void>}
 */
const viteWatchTask = async (ctx, task) => {
  const config = resolveViteConfig(ctx, task);

  const server = await createServer({
    ...config,
    server: {
      port: 4000,
    },
  });

  await server.listen();

  server.printUrls();
};

module.exports = { viteWatchTask };
