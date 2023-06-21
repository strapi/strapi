'use strict';

/**
 * This is where we'd do a rather generic config resolution incl. merging a user config with ours for overwrites.
 * This is probably more appropriate for library code as opposed to the bundling of the admin panel?
 */

/**
 * @type {(ctx: import('../strapi-client').BuildContext, task: import("./viteBuildTask").ViteBuildTask | import("./viteWatchTask").ViteWatchTask) => Promise<import("vite").InlineConfig>}
 */
const resolveViteConfig = (ctx, task) => {};

module.exports = { resolveViteConfig };
