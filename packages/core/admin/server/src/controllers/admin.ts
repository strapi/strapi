import _ from 'lodash';
import type { Context } from 'koa';

import path from 'path';

import { exists } from 'fs-extra';
import { env } from '@strapi/utils';
import type { Schema, Struct } from '@strapi/types';
import {
  validateUpdateProjectSettings,
  validateUpdateProjectSettingsFiles,
  validateUpdateProjectSettingsImagesDimensions,
} from '../validation/project-settings';
import { getService } from '../utils';

import type {
  Init,
  GetProjectSettings,
  GetProjectType,
  Information,
  Plugins,
  TelemetryProperties,
  UpdateProjectSettings,
  GetGuidedTourMeta,
  DebugDump,
} from '../../../shared/contracts/admin';

// Lazy: only resolved on first GET /admin/project-type request
type TsUtilsModule = typeof import('@strapi/typescript-utils');
let lazyTsUtils: TsUtilsModule | undefined;
const isUsingTypeScript: TsUtilsModule['isUsingTypeScript'] = (
  ...args: Parameters<TsUtilsModule['isUsingTypeScript']>
) => {
  if (!lazyTsUtils) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyTsUtils = require('@strapi/typescript-utils');
  }
  return (lazyTsUtils as TsUtilsModule).isUsingTypeScript(...args);
};

// Core plugins are always enabled, so they are omitted from the plugins list.
const CORE_PLUGINS = new Set([
  'content-manager',
  'content-type-builder',
  'email',
  'upload',
  'i18n',
  'content-releases',
  'review-workflows',
]);

/**
 * A set of functions called "actions" for `Admin`
 */
export default {
  // TODO very temporary to check the switch ee/ce
  // When removing this we need to update the /admin/src/index.js file
  // whe,re we set the strapi.window.isEE value

  // NOTE: admin/ee/server overrides this controller, and adds the EE features
  // This returns an empty feature list for CE
  async getProjectType(): Promise<GetProjectType.Response> {
    const flags = strapi.config.get('admin.flags', {});
    return { data: { isEE: false, isTrial: false, features: [], flags, ai: { enabled: false } } };
  },

  async init() {
    // `false as const` keeps the published `uuid: false` result type of develop.
    let uuid = strapi.config.get('uuid', false as const);
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
      return Object.values(strapi.contentTypes)
        .flatMap((contentType: Struct.ContentTypeSchema) => Object.values(contentType.attributes))
        .filter((attribute) => attribute.type === 'dynamiczone').length;
    };

    const getNumberOfFolders = async (): Promise<number> => {
      try {
        const contentStructure = strapi.get('content-structure') as
          { countGroups?: () => Promise<number> } | undefined;

        return (await contentStructure?.countGroups?.()) ?? 0;
      } catch {
        return 0;
      }
    };

    return {
      data: {
        useTypescriptOnServer,
        useTypescriptOnAdmin,
        isHostedOnStrapiCloud,
        numberOfAllContentTypes, // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
        numberOfComponents,
        numberOfDynamicZones: getNumberOfDynamicZones(),
        numberOfContentTypeFolders: await getNumberOfFolders(),
      },
    } satisfies TelemetryProperties.Response;
  },

  async information() {
    const currentEnvironment = strapi.config.get<string>('environment');
    // `false as const` keeps the published `autoReload: false` result type of develop.
    const autoReload = strapi.config.get('autoReload', false as const);
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

  async debugDump() {
    const data = await getService('debug-dump').generate();

    return { data } satisfies DebugDump.Response;
  },

  async plugins(ctx: Context) {
    const enabledPlugins = strapi.config.get('enabledPlugins') as any;

    const plugins = Object.entries(enabledPlugins)
      .filter(([key]: any) => !CORE_PLUGINS.has(key))
      .map(([key, plugin]: any) => ({
        name: plugin.info.name || key,
        displayName: plugin.info.displayName || plugin.info.name || key,
        description: plugin.info.description || '',
        packageName: plugin.info.packageName,
      }));

    ctx.send({ plugins } satisfies Plugins.Response);
  },

  async licenseTrialTimeLeft() {
    const data = await strapi.ee.getTrialEndDate({
      strapi,
    });

    return data;
  },

  async getGuidedTourMeta(ctx: Context) {
    const isFirstSuperAdminUser = await getService('user').isFirstSuperAdminUser(ctx.state.user.id);

    return {
      data: {
        isFirstSuperAdminUser,
        // Annotated so the published declaration resolves per application, not with this package's
        // strict types.
        schemas: strapi.contentTypes as Schema.ContentTypes,
      },
    } satisfies GetGuidedTourMeta.Response;
  },
};
