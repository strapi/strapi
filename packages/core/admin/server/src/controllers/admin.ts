import type { Context } from 'koa';

import path from 'path';
import fs from 'fs';

import { map, values, sumBy, pipe, flatMap, propEq } from 'lodash/fp';
import _ from 'lodash';
import { exists } from 'fs-extra';
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
  GetGuidedTourMeta,
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
    return { data: { isEE: false, features: [], flags, ai: { enabled: false } } };
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
    const aiLicenseKey = env('STRAPI_ADMIN_AI_LICENSE', undefined);

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

    // Build licenseInfo if available
    let licenseInfo:
      | {
          customerId: string;
          subscriptionId?: string;
          licenseKey: string;
          type: 'bronze' | 'silver' | 'gold' | 'growth' | 'enterprise';
          isTrial: boolean;
          expireAt: string;
          projectHash?: string;
          dependencyHash?: string;
        }
      | undefined;

    // If EE is enabled, build license info
    if (strapi.EE && strapi.ee?.isEE) {
      // Decode the license to extract licenseKey, planPriceId, subscriptionId, and other fields
      let licenseKey: string | null = null;
      let planPriceId: string | null = null;
      let subscriptionId: string | null = null;
      let expireAt: string | null = null;
      let customerId: string | null = null;

      try {
        let licenseContent: string | null = null;

        // Try environment variable first
        licenseContent = env('STRAPI_LICENSE', null) || null;

        // If not in env, try to read from license file
        if (!licenseContent) {
          const licensePath = path.join(strapi.dirs.app.root, 'license.txt');
          if (fs.existsSync(licensePath)) {
            licenseContent = fs.readFileSync(licensePath, 'utf8');
          }
        }

        // Decode the license to extract the fields
        if (licenseContent && licenseContent.trim()) {
          try {
            // License format: base64 encoded with signature and content separated by newline
            const decoded = Buffer.from(licenseContent, 'base64').toString();
            const base64Content = decoded.split('\n')[1];

            if (base64Content) {
              // Decode the inner base64 content to get the JSON string
              const stringifiedContent = Buffer.from(base64Content, 'base64').toString();
              const decodedLicenseInfo = JSON.parse(stringifiedContent);

              // Extract the fields from the decoded license JSON
              licenseKey = decodedLicenseInfo.licenseKey || null;
              planPriceId = decodedLicenseInfo.planPriceId || null;
              subscriptionId = decodedLicenseInfo.subscriptionId || null;
              customerId = decodedLicenseInfo.customerId || null;

              // Convert expireAt timestamp to ISO string if it's a number
              if (decodedLicenseInfo.expireAt) {
                if (typeof decodedLicenseInfo.expireAt === 'number') {
                  expireAt = new Date(decodedLicenseInfo.expireAt).toISOString();
                } else {
                  expireAt = decodedLicenseInfo.expireAt;
                }
              }
            }
          } catch (decodeError) {
            // If decoding fails, ignore
          }
        }
      } catch (e) {
        // Ignore errors
      }

      // If we have a license key (EE is enabled), build license info
      if (licenseKey) {
        const projectId = String(strapi.config.get('uuid') || '');

        // Extract license type from planPriceId (e.g., "growth" from "growth-v2-USD-Monthly")
        // or fallback to strapi.ee.type
        let licenseType: string | null = null;

        if (planPriceId) {
          // Extract the plan name from planPriceId (e.g., "growth" from "growth-v2-USD-Monthly")
          const planMatch = planPriceId.match(/^(growth|enterprise|bronze|silver|gold)/i);
          if (planMatch) {
            licenseType = planMatch[1].toLowerCase();
          }
        }

        // If we don't have type from planPriceId, try to get from strapi.ee
        if (!licenseType) {
          try {
            licenseType = strapi.ee.type || null;
          } catch (e) {
            // Ignore errors
          }
        }

        // Normalize license type - handle growth and enterprise types
        if (licenseType === 'growth' || licenseType === 'enterprise') {
          // Keep as is
        } else if (!licenseType || !['bronze', 'silver', 'gold'].includes(licenseType)) {
          // Default to enterprise if type is not standard
          licenseType = 'enterprise';
        }

        // Use default expireAt if not found
        if (!expireAt) {
          expireAt = new Date().toISOString();
        }

        // Use customerId from decoded license, or fallback to projectId
        const finalCustomerId = customerId || projectId;

        licenseInfo = {
          customerId: finalCustomerId,
          subscriptionId: subscriptionId || undefined,
          licenseKey,
          type:
            (licenseType as 'bronze' | 'silver' | 'gold' | 'growth' | 'enterprise') || 'enterprise',
          isTrial: strapi.ee.isTrial || false,
          expireAt,
        };
      }
    }

    return {
      data: {
        useTypescriptOnServer,
        useTypescriptOnAdmin,
        isHostedOnStrapiCloud,
        aiLicenseKey,
        numberOfAllContentTypes, // TODO: V5: This event should be renamed numberOfContentTypes in V5 as the name is already taken to describe the number of content types using i18n.
        numberOfComponents,
        numberOfDynamicZones: getNumberOfDynamicZones(),
        ...(licenseInfo && { licenseInfo }),
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
