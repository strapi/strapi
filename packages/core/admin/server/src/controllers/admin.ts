import type { Context } from 'koa';

import path from 'path';

import { map, values, sumBy, pipe, flatMap, propEq } from 'lodash/fp';
import _ from 'lodash';
import { exists } from 'fs-extra';
import '@strapi/types';
import { env } from '@strapi/utils';
import tsUtils from '@strapi/typescript-utils';
import {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
} from '../validation/project-settings';
import { getService } from '../utils';

import type {
  Init,
  GetProjectSettings,
  Information,
  Plugins,
  TelemetryProperties,
  UpdateProjectSettings,
} from '../../../shared/contracts/admin';

const { isUsingTypeScript } = tsUtils;

/**
 * A set of functions called "actions" for `Admin`
 */
export default {
  // TODO very temporary to check the switch ee/ce
  // When removing this we need to update the /admin/src/index.js file
  // whe,re we set the strapi.window.isEE value

  // NOTE: admin/ee/server overrides this controller, and adds the EE features
  // This returns an empty feature list for CE
  async getProjectType() {
    const flags = strapi.config.get('admin.flags', {});
    return { data: { isEE: false, features: [], flags } };
  },

  async init() {
    let uuid = strapi.config.get('uuid', false);
    const hasAdmin = await getService('user').exists();
    const { menuLogo, authLogo } = await getService('project-settings').getProjectSettings();
    // set to null if telemetryDisabled flag not avaialble in package.json
    const telemetryDisabled: boolean | null = strapi.config.get(
      'packageJsonStrapi.telemetryDisabled',
      null
    );

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
    } satisfies Init.Response;
  },

  async getProjectSettings() {
    return getService(
      'project-settings'
    ).getProjectSettings() satisfies Promise<GetProjectSettings.Response>;
  },

  async updateProjectSettings(ctx: Context) {
    const {
      request: { files, body },
    } = ctx as { request: UpdateProjectSettings.Request };

    const projectSettingsService = getService('project-settings');

    await validateUpdateProjectSettings(body);
    await validateUpdateProjectSettingsFiles(files);

    const formatedFiles = await projectSettingsService.parseFilesData(files);
    await validateUpdateProjectSettingsImagesDimensions(formatedFiles);

    return projectSettingsService.updateProjectSettings({
      ...body,
      ...formatedFiles,
    }) satisfies Promise<UpdateProjectSettings.Response>;
  },

  async telemetryProperties(ctx: Context) {
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
        // @ts-expect-error lodash types
        sumBy(propEq('type', 'dynamiczone'))
      )(strapi.contentTypes as any);
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
    } satisfies TelemetryProperties.Response;
  },

  async information() {
    const currentEnvironment: string = strapi.config.get('environment');
    const autoReload = strapi.config.get('autoReload', false);
    const strapiVersion = strapi.config.get('info.strapi', null);
    const dependencies = strapi.config.get('info.dependencies', {});
    const projectId = strapi.config.get('uuid', null);
    const nodeVersion = process.version;
    const communityEdition = !strapi.EE;
    const useYarn: boolean = await exists(path.join(process.cwd(), 'yarn.lock'));

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
    } satisfies Information.Response;
  },

  async plugins(ctx: Context) {
    const enabledPlugins = strapi.config.get('enabledPlugins') as any;

    // List of core plugins that are always enabled,
    // and so it's not necessary to display them in the plugins list
    const CORE_PLUGINS = [
      'content-manager',
      'content-type-builder',
      'email',
      'upload',
      'i18n',
      'content-releases',
      'review-workflows',
    ];

    const plugins = Object.entries(enabledPlugins)
      .filter(([key]: any) => !CORE_PLUGINS.includes(key))
      .map(([key, plugin]: any) => ({
        name: plugin.info.name || key,
        displayName: plugin.info.displayName || plugin.info.name || key,
        description: plugin.info.description || '',
        packageName: plugin.info.packageName,
      }));

    ctx.send({ plugins }) satisfies Plugins.Response;
  },
};
