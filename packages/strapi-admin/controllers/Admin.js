'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').execSync;

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {

  index: async(ctx) => {
    try {
      // Send the HTML file with injected scripts
      ctx.body = strapi.admin.services.admin.generateAdminIndexFile();
    } catch (err) {
      ctx.body = err;
    }
  },

  pluginFile: async (ctx, next) => {
    try {
      // Will be served through the public middleware
      if (ctx.params.plugin === 'plugins') {
        return await next();
      }

      const file = fs.readFileSync(path.resolve(process.cwd(), 'plugins', ctx.params.plugin, 'admin', 'build', `${ctx.params.file}`));
      ctx.body = file;
    } catch (err) {
      ctx.body = ctx.notFound();
    }
  },

  file: async ctx => {
    try {
      const file = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'build', ctx.params.file));
      ctx.body = file;
    } catch (err) {
      // Fallback, render admin page
      ctx.body = strapi.admin.services.admin.generateAdminIndexFile();
    }
  },

  uninstallPlugin: async ctx => {
    try {
      const { plugin } = ctx.params;
      const strapiBin = path.join(process.cwd(), 'node_modules', 'strapi', 'bin', 'strapi');

      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      exec(`node ${strapiBin} uninstall ${plugin}`);

      ctx.send({ ok: true });

      strapi.reload();
    } catch(err) {
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occured' }] }]);
    }
  }
};
