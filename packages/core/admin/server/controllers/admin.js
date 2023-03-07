'use strict';

const path = require('path');

const { map, values, sumBy, pipe, flatMap, propEq } = require('lodash/fp');
const _ = require('lodash');
const { exists } = require('fs-extra');
const { env } = require('@strapi/utils');
const { isUsingTypeScript } = require('@strapi/typescript-utils');
// eslint-disable-next-line node/no-extraneous-require
const ee = require('@strapi/strapi/lib/utils/ee');

const {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
} = require('../validation/project-settings');
const { getService } = require('../utils');

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
      return { data: { isEE: strapi.EE, features: ee.features.list() } };
    } catch (err) {
      return { data: { isEE: false, features: [] } };
    }
  },

  async init() {
    let uuid = strapi.config.get('uuid', false);
    const hasAdmin = await getService('user').exists();
    const { menuLogo, authLogo } = await getService('project-settings').getProjectSettings();
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
        authLogo: authLogo ? authLogo.url : null,
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
    const isHostedOnStrapiCloud = env('STRAPI_HOSTING', null) === 'strapi.cloud';

    const numberOfAllContentTypes = _.size(strapi.contentTypes);
    const numberOfComponents = _.size(strapi.components);

    const getNumberOfDynamicZones = () => {
      return pipe(
        map('attributes'),
        flatMap(values),
        sumBy(propEq('type', 'dynamiczone'))
      )(strapi.contentTypes);
    };

    return {
      data: {
        useTypescriptOnServer,
        useTypescriptOnAdmin,
        isHostedOnStrapiCloud,
        numberOfAllContentTypes, // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
        numberOfComponents,
        numberOfDynamicZones: getNumberOfDynamicZones(),
      },
    };
  },

  async information() {
    const currentEnvironment = strapi.config.get('environment');
    const autoReload = strapi.config.get('autoReload', false);
    const strapiVersion = strapi.config.get('info.strapi', null);
    const dependencies = strapi.config.get('info.dependencies', {});
    const projectId = strapi.config.get('uuid', null);
    const nodeVersion = process.version;
    const communityEdition = !strapi.EE;
    const useYarn = await exists(path.join(process.cwd(), 'yarn.lock'));

    return {
      data: {
        currentEnvironment,
        autoReload,
        strapiVersion,
        dependencies,
        projectId,
        nodeVersion,
        communityEdition,
        useYarn,
      },
    };
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
};
