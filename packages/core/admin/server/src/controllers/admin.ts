import path from 'path';

import ee from '@strapi/strapi/dist/utils/ee';
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

const { isUsingTypeScript } = tsUtils;

/**
 * A set of functions called "actions" for `Admin`
 */

// TODO very temporary to check the switch ee/ce
// When removing this we need to update the /admin/src/index.js file
// where we set the strapi.window.isEE value
export async function getProjectType() {
  const flags = strapi.config.get('admin.flags', {});
  // FIXME
  try {
    return { data: { isEE: strapi.EE, features: ee.features.list(), flags } };
  } catch (err) {
    return { data: { isEE: false, features: [], flags } };
  }
}

export async function init() {
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
}

export async function getProjectSettings() {
  return getService('project-settings').getProjectSettings();
}

export async function updateProjectSettings(ctx: any) {
  const projectSettingsService = getService('project-settings');

  const {
    request: { files, body },
  } = ctx;

  await validateUpdateProjectSettings(body);
  await validateUpdateProjectSettingsFiles(files);

  const formatedFiles = await projectSettingsService.parseFilesData(files);
  await validateUpdateProjectSettingsImagesDimensions(formatedFiles);

  return projectSettingsService.updateProjectSettings({ ...body, ...formatedFiles });
}

export async function telemetryProperties(ctx: any) {
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
      // @ts-expect-error
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
  };
}

export async function information() {
  const currentEnvironment = strapi.config.get('environment');
  const autoReload = strapi.config.get('autoReload', false);
  const strapiVersion = strapi.config.get('info.strapi', null);
  const dependencies = strapi.config.get('info.dependencies', {});
  const projectId = strapi.config.get('uuid', null);
  const nodeVersion = process.version;
  const communityEdition = !strapi.EE;
  // @ts-expect-error
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
}

export async function plugins(ctx: any) {
  const enabledPlugins = strapi.config.get('enabledPlugins') as any;

  const plugins = Object.entries(enabledPlugins).map(([key, plugin]: any) => ({
    name: plugin.info.name || key,
    displayName: plugin.info.displayName || plugin.info.name || key,
    description: plugin.info.description || '',
    packageName: plugin.info.packageName,
  }));

  ctx.send({ plugins });
}
