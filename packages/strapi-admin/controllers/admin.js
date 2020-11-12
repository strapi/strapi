'use strict';

const execa = require('execa');
const _ = require('lodash');

const PLUGIN_NAME_REGEX = /^[A-Za-z][A-Za-z0-9-_]+$/;

/**
 * Validates a plugin name format
 */
const isValidPluginName = plugin => {
  return _.isString(plugin) && !_.isEmpty(plugin) && PLUGIN_NAME_REGEX.test(plugin);
};

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  async init() {
    const uuid = strapi.config.get('uuid', false);
    const hasAdmin = await strapi.admin.services.user.exists();

    return { data: { uuid, hasAdmin } };
  },

  async information() {
    const currentEnvironment = strapi.app.env;
    const autoReload = strapi.config.get('autoReload', false);
    const strapiVersion = strapi.config.get('info.strapi', null);
    const nodeVersion = process.version;
    const communityEdition = !strapi.EE;

    return {
      data: { currentEnvironment, autoReload, strapiVersion, nodeVersion, communityEdition },
    };
  },

  async installPlugin(ctx) {
    try {
      const { plugin } = ctx.request.body;

      if (!isValidPluginName(plugin)) {
        return ctx.badRequest('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'install', plugin]);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async plugins(ctx) {
    try {
      const plugins = Object.keys(strapi.plugins).reduce((acc, key) => {
        acc[key] = _.get(strapi.plugins, [key, 'package', 'strapi'], {
          name: key,
        });

        return acc;
      }, {});

      ctx.send({ plugins });
    } catch (err) {
      strapi.log.error(err);
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },

  async uninstallPlugin(ctx) {
    try {
      const { plugin } = ctx.params;

      if (!isValidPluginName(plugin)) {
        return ctx.badRequest('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'uninstall', plugin, '-d']);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.log.error(err);
      strapi.reload.isWatching = true;
      ctx.badRequest(null, [{ messages: [{ id: 'An error occurred' }] }]);
    }
  },
};
