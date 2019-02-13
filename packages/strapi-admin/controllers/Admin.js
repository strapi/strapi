'use strict';

const path = require('path');
const exec = require('child_process').spawnSync;
const _ = require('lodash');

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  getCurrentEnvironment: async ctx => {
    try {
      ctx.send({ currentEnvironment: strapi.app.env });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getStrapiVersion: async ctx => {
    try {
      const strapiVersion = _.get(strapi.config, 'info.strapi', null);
      return ctx.send({ strapiVersion });
    } catch(err) {
      return ctx.badRequest(null, [{ messages: [{ id: 'The version is not available' }] }]);
    }
  },

  getGaConfig: async ctx => {
    try {
      ctx.send({ uuid: _.get(strapi.config, 'uuid', false) });
    } catch(err) {
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  getLayout: async ctx => {
    try {
      const layout = require('../config/layout.js');

      return ctx.send({ layout });
    } catch(err) {
      return ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  installPlugin: async ctx => {
    try {
      const { plugin, port } = ctx.request.body;
      const strapiBin = path.join(process.cwd(), 'node_modules', 'strapi', 'bin', 'strapi');

      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      exec('node', [strapiBin, 'install', plugin, (port === '4000') ? '--dev' : '']);

      ctx.send({ ok: true });

      strapi.reload();
    } catch(err) {
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
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
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  uninstallPlugin: async ctx => {
    try {
      const { plugin } = ctx.params;
      const strapiBin = path.join(process.cwd(), 'node_modules', 'strapi', 'bin', 'strapi');

      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      exec('node', [strapiBin, 'uninstall', plugin]);

      ctx.send({ ok: true });

      strapi.reload();
    } catch(err) {
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  /**
   * Create a/an admin record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const values = ctx.request.body;

    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    const data = await strapi.query('admin', 'users-permissions').create(values);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an admin record.
   *
   * @return {Object}
   */

  update: async (ctx) => {
    const values = ctx.request.body;

    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    const data = await strapi.query('admin', 'users-permissions').update(_.assign(ctx.params, values));

    // Send 200 `ok`
    ctx.send(data);
  }
};
