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

  async dashboardData(ctx: Context) {
    const stats = await getService('statistics').getStatistics();
    const upcomingReleases = await strapi.documents('plugin::content-releases.release').findMany({
      limit: 10,
      filters: {
        scheduledAt: {
          $gt: new Date(),
        },
      },
      sort: 'scheduledAt:asc',
    });

    const lastActivities = await strapi.documents('admin::audit-log').findMany({
      limit: 10,
      sort: 'createdAt:desc',
    });

    const oneWeekAgo = new Date();

    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const contributions = await strapi.documents('admin::audit-log').findMany({
      sort: 'date:desc',
      populate: ['user'],
      filters: {
        action: ['entry.create', 'entry.update', 'entry.delete'],
        date: {
          $gt: oneWeekAgo,
        },
      },
    });

    const allContributors = contributions.reduce((acc, log) => {
      const user = log.user.documentId;

        if (!acc[user]) {
          acc[user] = {
            creations: 0,
            updates: 0,
            deletions: 0,
            user: {
              id: user,
              firstname: log.user.firstname,
              lastname: log.user.lastname,
            },
          };
        }

        if (log.action === 'entry.create') {
          acc[user].creations += 1;
        } else if (log.action === 'entry.update') {
          acc[user].updates += 1;
        } else if (log.action === 'entry.delete') {
          acc[user].deletions += 1;
        }

        return acc;
      },
      {} as {
        [id: string]: {
          creations: number;
          updates: number;
          deletions: number;
          user: { id: string; firstname: string; lastname: string };
        };
      }
    );

    const topContributors = Object.values(allContributors).sort((a, b) => {
      const aTotal = a.creations + a.updates + a.deletions;
      const bTotal = b.creations + b.updates + b.deletions;

      return bTotal - aTotal;
    }).slice(0, 5);

    const assignedToMe = await assignedEntries(ctx.state.user.id);

    ctx.body = {
      name: ctx.state.user.firstname,
      statistics: stats,
      releases: {
        upcoming: upcomingReleases,
      },
      lastActivities,
      topContributors: Object.values(topContributors),
      assignedToMe,
    };
  },
};

type AssignedEntriesResult = {
  contentType: { name: string, uid: string },
  entry: { id: number, documentId: string, updatedAt: string, name: string, locale: string},
}[];

async function assignedEntries(userId: number): Promise<AssignedEntriesResult> {
  const workflows = await strapi.documents('plugin::review-workflows.workflow').findMany();

  const contentTypes = [...new Set(workflows.flatMap((workflow) => workflow.contentTypes))]; // Set to remove duplicates

  const result: AssignedEntriesResult = [];

  await Promise.all(
    contentTypes.flatMap((contentType) => {
      return strapi
        .documents(contentType)
        .findMany({
          filters: {
            strapi_assignee: userId,
          },
        })
        .then((entries) => {
          entries.forEach((entry) => {
            result.push({
              contentType: {
                name: strapi.contentTypes[contentType].info.displayName,
                uid: contentType,
              },
              entry: {
                documentId: entry.documentId,
                locale: entry.locale,
                name: entryDisplayName(entry),
                id: entry.id,
                updatedAt: entry.updatedAt,
              },
            });
          });
        });
    })
  );

  return result.sort((a, b) => {
    return new Date(b.entry.updatedAt).getTime() - new Date(a.entry.updatedAt).getTime();
  });
}

function entryDisplayName(entry: {[k: string]: unknown}): string {
  const entryLowercased = Object.fromEntries(
    Object.entries(entry).map(([k, v]) => [k.toLowerCase(), v])
  );

  const displayName = entryLowercased.name || entryLowercased.title;

  if (typeof displayName === 'string') {
    return displayName;
  }

  delete entryLowercased.id;
  delete entryLowercased.documentid;

  const values = Object.values(entryLowercased).filter((v) => typeof v === 'string') as string[];

  if (values.length > 0) {
    const value = values[0];
    return value.length > 20 ? `${value.slice(0, 20)}...` : value;
  }

  return `Item #${entry.id}`;
}
