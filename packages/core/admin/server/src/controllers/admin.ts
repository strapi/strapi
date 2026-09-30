import type { Context } from 'koa';

import path from 'path';

import { map, values, sumBy, pipe, flatMap, propEq, isNil } from 'lodash/fp';
import _ from 'lodash';
import { exists } from 'fs-extra';
import { env } from '@strapi/utils';
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

/**
 * A set of functions called "actions" for `Admin`
 */
export default {
  async getProjectType(): Promise<GetProjectType.Response> {
    const flags = strapi.config.get('admin.flags', {});

    try {
      return {
        data: {
          // The license fields are nullable internally; the contract is not.
          isEE: Boolean(strapi.EE),
          isTrial: strapi.ee.isTrial,
          features: strapi.ee.features.list(),
          flags,
          type: strapi.ee.type ?? undefined,
          planPriceId: strapi.ee.planPriceId ?? undefined,
          projectType: strapi.ee.edition,
          hasSeatLimit: isNil(strapi.ee.seats) === false,
          ai: {
            enabled: strapi.ai.admin.isStrapiManagedAiEnabled(),
          },
        },
      };
    } catch {
      return {
        data: {
          isEE: false,
          isTrial: false,
          features: [],
          flags,
          projectType: 'Community',
          hasSeatLimit: false,
          ai: { enabled: false },
        },
      };
    }
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

    const getNumberOfFolders = async (): Promise<number> => {
      try {
        const contentStructure = strapi.get('content-structure') as
          | { countGroups?: () => Promise<number> }
          | undefined;

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

    ctx.send({ plugins } satisfies Plugins.Response);
  },

  // TODO @Nico the contract types `features` with the known feature names only, while this returns
  // every license entry, like /project-type does
  async licenseLimitInformation() {
    const permittedSeats = strapi.ee.seats;

    let shouldNotify = false;
    let licenseLimitStatus: 'OVER_LIMIT' | 'AT_LIMIT' | null = null;
    let enforcementUserCount;

    const currentActiveUserCount = await getService('user').count({ isActive: true });

    const eeDisabledUsers = await getService('seat-enforcement').getDisabledUserList();

    if (Array.isArray(eeDisabledUsers)) {
      enforcementUserCount = currentActiveUserCount + eeDisabledUsers.length;
    } else {
      enforcementUserCount = currentActiveUserCount;
    }

    if (!isNil(permittedSeats) && enforcementUserCount > permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'OVER_LIMIT';
    }

    if (!isNil(permittedSeats) && enforcementUserCount === permittedSeats) {
      shouldNotify = true;
      licenseLimitStatus = 'AT_LIMIT';
    }

    const data = {
      enforcementUserCount,
      currentActiveUserCount,
      permittedSeats,
      shouldNotify,
      shouldStopCreate: isNil(permittedSeats) ? false : currentActiveUserCount >= permittedSeats,
      licenseLimitStatus,
      isHostedOnStrapiCloud: env('STRAPI_HOSTING', null) === 'strapi.cloud',
      type: strapi.ee.type,
      isTrial: strapi.ee.isTrial,
      features: strapi.ee.features.list() ?? [],
    };

    return { data };
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
        schemas: strapi.contentTypes,
      },
    } satisfies GetGuidedTourMeta.Response;
  },
};
