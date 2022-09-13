'use strict';

const path = require('path');
const execa = require('execa');
const _ = require('lodash');
const { exists } = require('fs-extra');
const { ValidationError } = require('@strapi/utils').errors;
const { isUsingTypeScript } = require('@strapi/typescript-utils');
// eslint-disable-next-line node/no-extraneous-require
const ee = require('@strapi/strapi/lib/utils/ee');

const {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
} = require('../validation/project-settings');
const { getService } = require('../utils');

const PLUGIN_NAME_REGEX = /^[A-Za-z][A-Za-z0-9-_]+$/;

/**
 * Validates a plugin name format
 */
const isValidPluginName = (plugin) => {
  return _.isString(plugin) && !_.isEmpty(plugin) && PLUGIN_NAME_REGEX.test(plugin);
};

/**
 * A set of functions called "actions" for `Admin`
 */

module.exports = {
  // TODO very temporary to check the switch ee/ce
  // When removing this we need to update the /admin/src/index.js file
  // where we set the strapi.window.isEE value
  async getProjectType() {
    // FIXME
    try {
      return { data: { isEE: strapi.EE, features: ee.features.getEnabled() } };
    } catch (err) {
      return { data: { isEE: false, features: [] } };
    }
  },

  async init() {
    let uuid = strapi.config.get('uuid', false);
    const hasAdmin = await getService('user').exists();
    const { menuLogo } = await getService('project-settings').getProjectSettings();
    // set to null if telemetryDisabled flag not avaialble in package.json
    const telemetryDisabled = strapi.config.get('packageJsonStrapi.telemetryDisabled', null);

    if (telemetryDisabled !== null && telemetryDisabled === true) {
      uuid = false;
    }

    return {
      data: {
        uuid,
        hasAdmin,
        menuLogo: menuLogo ? menuLogo.url : null,
      },
    };
  },

  async getProjectSettings() {
    return getService('project-settings').getProjectSettings();
  },

  async updateProjectSettings(ctx) {
    const projectSettingsService = getService('project-settings');

    const {
      request: { files, body },
    } = ctx;

    await validateUpdateProjectSettings(body);
    await validateUpdateProjectSettingsFiles(files);

    const formatedFiles = await projectSettingsService.parseFilesData(files);
    await validateUpdateProjectSettingsImagesDimensions(formatedFiles);

    return projectSettingsService.updateProjectSettings({ ...body, ...formatedFiles });
  },

  async telemetryProperties(ctx) {
    // If the telemetry is disabled, ignore the request and return early
    if (strapi.telemetry.isDisabled) {
      ctx.status = 204;
      return;
    }

    const useTypescriptOnServer = await isUsingTypeScript(strapi.dirs.app.root);
    const useTypescriptOnAdmin = await isUsingTypeScript(
      path.join(strapi.dirs.app.root, 'src', 'admin')
    );

    return {
      data: {
        useTypescriptOnServer,
        useTypescriptOnAdmin,
      },
    };
  },

  async information() {
    const currentEnvironment = strapi.config.get('environment');
    const autoReload = strapi.config.get('autoReload', false);
    const strapiVersion = strapi.config.get('info.strapi', null);
    const dependencies = strapi.config.get('info.dependencies', {});
    const nodeVersion = process.version;
    const communityEdition = !strapi.EE;
    const useYarn = await exists(path.join(process.cwd(), 'yarn.lock'));

    return {
      data: {
        currentEnvironment,
        autoReload,
        strapiVersion,
        dependencies,
        nodeVersion,
        communityEdition,
        useYarn,
      },
    };
  },

  async installPlugin(ctx) {
    try {
      const { plugin } = ctx.request.body;

      if (!isValidPluginName(plugin)) {
        throw new ValidationError('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Installing ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'install', plugin]);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.reload.isWatching = true;
      throw err;
    }
  },

  async plugins(ctx) {
    const enabledPlugins = strapi.config.get('enabledPlugins');

    const plugins = Object.entries(enabledPlugins).map(([key, plugin]) => ({
      name: plugin.info.name || key,
      displayName: plugin.info.displayName || plugin.info.name || key,
      description: plugin.info.description || '',
      packageName: plugin.info.packageName,
    }));

    ctx.send({ plugins });
  },

  async uninstallPlugin(ctx) {
    try {
      const { plugin } = ctx.params;

      if (!isValidPluginName(plugin)) {
        throw new ValidationError('Invalid plugin name');
      }

      strapi.reload.isWatching = false;

      strapi.log.info(`Uninstalling ${plugin}...`);
      await execa('npm', ['run', 'strapi', '--', 'uninstall', plugin, '-d']);

      ctx.send({ ok: true });

      strapi.reload();
    } catch (err) {
      strapi.reload.isWatching = true;
      throw err;
    }
  },
};
