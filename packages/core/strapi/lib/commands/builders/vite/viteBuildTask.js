'use strict';

const { build } = require('vite');
const path = require('path');

/**
 * This could be changed into a more "generic" task structure that would allow us to queue
 * different tasks using the same formula.
 */

/**
 * @typedef ViteBuildTask
 */

/**
 * @type {(ctx: import('../strapi-client').BuildContext, task: ViteBuildTask) => Promise<void>}
 */
const viteBuildTask = async (ctx, task) => {
  await build({
    root: ctx.cwd,
    cacheDir: 'node_modules/.strapi/vite',
    configFile: false,
    ...task,
    build: {
      outDir: path.resolve(ctx.distDir, 'build'),
      sourcemap: true,
      ...task.build,
    },
  });
};

module.exports = { viteBuildTask };
