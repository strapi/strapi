'use strict';

const path = require('path');
const exec = require('child_process').execSync;

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  installPlugin: async ctx => {
    try {
      const { plugin, port } = ctx.request.body;
      const strapiBin = path.join(process.cwd(), 'node_modules', 'strapi', 'bin', 'strapi');

      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      
      exec(`node ${strapiBin} install ${plugin} ${port === '4000' ? '--dev' : ''}`);

      ctx.send({ ok: true });

      strapi.reload();
    } catch(err) {
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occured' }] }]);
    }
  },

  plugins: async ctx => {
    try {
      const plugins = Object.keys(strapi.plugins).reduce((acc, key) => {
        acc[key] = strapi.plugins[key].package.strapi;

        return acc;
      }, {});

      ctx.send({ plugins });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occured' }] }]);
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
