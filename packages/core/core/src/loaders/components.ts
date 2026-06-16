import { join } from 'path';
import _ from 'lodash';
import { pathExists } from 'fs-extra';
import type { Core, Struct, UID } from '@strapi/types';
import { loadFiles } from '../utils/load-files';

type LoadedComponent = {
  collectionName: string;
  __filename__: string;
  __schema__: LoadedComponent;
  uid: string;
  category: string;
  modelName: string;
  globalId: string;
  info: any;
  attributes: any;
};

type LoadedComponents = {
  [category: string]: {
    [key: string]: LoadedComponent;
  };
};

type ComponentMap = {
  [uid in UID.Component]: Struct.ComponentSchema;
};

/**
 * Path-parametric core: load components from `dir` and register them. `appDir`
 * is only used to build human-readable file paths in error messages (defaults
 * to `dir`). Shared by the legacy wrapper and the programmatic `fromDisk`
 * resolver.
 */
export async function loadComponentsFromDir(
  strapi: Core.Strapi,
  dir: string,
  appDir: string = dir
) {
  if (!(await pathExists(dir))) {
    return {};
  }

  const map = await loadFiles<LoadedComponents>(dir, '*/*.*(js|json)');

  const components = Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach((key) => {
      const schema = map[category][key];

      if (!schema.collectionName) {
        // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
        const filePath = join(appDir, category, schema.__filename__);

        return strapi.stopWithError(
          `Component ${key} is missing a "collectionName" property.\nVerify file ${filePath}.`
        );
      }

      const uid: UID.Component = `${category}.${key}`;

      acc[uid] = Object.assign(schema, {
        __schema__: _.cloneDeep(schema),
        uid,
        category,
        modelType: 'component' as const,
        modelName: key,
        globalId: schema.globalId || _.upperFirst(_.camelCase(`component_${uid}`)),
      });
    });

    return acc;
  }, {} as ComponentMap);

  strapi.get('components').add(components);
}

export default async function loadComponents(strapi: Core.Strapi) {
  return loadComponentsFromDir(strapi, strapi.dirs.dist.components, strapi.dirs.app.components);
}
