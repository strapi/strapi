import { basename, join, resolve } from 'path';
import _ from 'lodash';
import { pathExists } from 'fs-extra';
import { glob } from 'glob';
import { importDefault } from '@strapi/utils';
import type { Core, Struct, UID } from '@strapi/types';
import { loadFiles } from '../utils/load-files';
import { filePathToPropPath } from '../utils/filepath-to-prop-path';
import {
  validateComponentLifecycles,
  type ComponentLifecycles,
} from '../domain/component/validator';

/**
 * A component can declare database lifecycle hooks in a file sitting next to its schema:
 *
 * ```
 * src/components/<category>/<name>.json
 * src/components/<category>/<name>.lifecycles.js   (or .ts in TypeScript projects)
 * ```
 *
 * The hooks are attached to the component model exactly like content-type lifecycles.
 */
const LIFECYCLES_FILES_PATTERN = '*/*.lifecycles.js';

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
  lifecycles?: ComponentLifecycles;
};

type LoadedComponents = {
  [category: string]: {
    [key: string]: LoadedComponent;
  };
};

type LoadedLifecycles = {
  [category: string]: {
    [key: string]: { module: unknown; filename: string };
  };
};

type ComponentMap = {
  [uid in UID.Component]: Struct.ComponentSchema;
};

const loadLifecycles = async (dir: string): Promise<LoadedLifecycles> => {
  const files = await glob(LIFECYCLES_FILES_PATTERN, { cwd: dir });
  const lifecycles: LoadedLifecycles = {};

  for (const file of files) {
    const absolutePath = resolve(dir, file);

    delete require.cache[absolutePath];

    // `<category>/<name>.lifecycles.js` -> ['<category>', '<name>', 'lifecycles']
    const [category, key] = filePathToPropPath(file);

    _.set(lifecycles, [category, key], {
      module: importDefault(absolutePath),
      filename: basename(file),
    });
  }

  return lifecycles;
};

const warnAboutOrphanLifecycles = (
  strapi: Core.Strapi,
  schemas: LoadedComponents,
  lifecycles: LoadedLifecycles
) => {
  for (const category of Object.keys(lifecycles)) {
    for (const key of Object.keys(lifecycles[category])) {
      if (schemas[category]?.[key]) {
        continue;
      }

      // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
      const categoryDir = join(strapi.dirs.app.components, category);
      const filePath = join(categoryDir, lifecycles[category][key].filename);
      const expectedSchemaPath = join(categoryDir, `${key}.json`);

      strapi.log.warn(
        `Ignoring lifecycles file ${filePath}: no schema found for component "${category}.${key}" (expected ${expectedSchemaPath}).`
      );
    }
  }
};

export default async function loadComponents(strapi: Core.Strapi) {
  if (!(await pathExists(strapi.dirs.dist.components))) {
    return {};
  }

  const map = await loadFiles<LoadedComponents>(strapi.dirs.dist.components, '*/*.*(js|json)', {
    globArgs: { ignore: LIFECYCLES_FILES_PATTERN },
  });
  const lifecyclesMap = await loadLifecycles(strapi.dirs.dist.components);

  const components = Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach((key) => {
      const schema = map[category][key];

      if (!schema.collectionName) {
        // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
        const filePath = join(strapi.dirs.app.components, category, schema.__filename__);

        return strapi.stopWithError(
          `Component ${key} is missing a "collectionName" property.\nVerify file ${filePath}.`
        );
      }

      const uid: UID.Component = `${category}.${key}`;

      const loadedLifecycles = lifecyclesMap[category]?.[key];
      const lifecycles = loadedLifecycles
        ? validateComponentLifecycles(uid, loadedLifecycles.module)
        : {};

      acc[uid] = Object.assign(schema, {
        __schema__: _.cloneDeep(schema),
        uid,
        category,
        modelType: 'component' as const,
        modelName: key,
        globalId: schema.globalId || _.upperFirst(_.camelCase(`component_${uid}`)),
        lifecycles,
      });
    });

    return acc;
  }, {} as ComponentMap);

  warnAboutOrphanLifecycles(strapi, map, lifecyclesMap);

  strapi.get('components').add(components);
}
