import { basename, join, resolve } from 'path';
import _ from 'lodash';
import { pathExists } from 'fs-extra';
import { glob } from 'glob';
import { importDefault } from '@strapi/utils';
import type { Core, Struct, UID } from '@strapi/types';
import { loadFiles } from '../utils/load-files';
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

type LifecyclesFiles = {
  [category: string]: {
    [key: string]: { absolutePath: string; filename: string };
  };
};

type ComponentMap = {
  [uid in UID.Component]: Struct.ComponentSchema;
};

// `<category>/<name>.lifecycles.js`, where `<name>` is the name of a schema file (no dot)
// Case-insensitive like the glob on macOS and Windows; keys are lower-cased like the schema keys
const LIFECYCLES_FILE = /^([^/\\]+)[/\\]([^/\\.]+)\.lifecycles\.js$/i;

/**
 * Lists the lifecycles files without importing them: a file is only imported once its component
 * exists, so that a file left behind by a deleted component can't stop the app.
 */
const listLifecyclesFiles = async (strapi: Core.Strapi, dir: string) => {
  // Case-insensitive on every platform, as it is by default on macOS and Windows
  const files = await glob(LIFECYCLES_FILES_PATTERN, { cwd: dir, nocase: true });
  const lifecyclesFiles: LifecyclesFiles = {};

  for (const file of files) {
    const match = LIFECYCLES_FILE.exec(file);

    if (!match) {
      // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
      strapi.log.warn(
        `Ignoring lifecycles file ${join(
          strapi.dirs.app.components,
          file
        )}: expected <category>/<name>.lifecycles.js (or .ts), next to <name>.json.`
      );
      continue;
    }

    // Schema keys are lower-cased by the loader, see `filePathToPropPath`
    const [, category, key] = match.map((part) => part.toLowerCase());

    _.set(lifecyclesFiles, [category, key], {
      absolutePath: resolve(dir, file),
      filename: basename(file),
    });
  }

  return lifecyclesFiles;
};

const importLifecycles = (uid: string, filePath: string, displayPath: string) => {
  delete require.cache[filePath];

  try {
    return importDefault(filePath);
  } catch (error) {
    throw new Error(
      `Could not load the lifecycles of component ${uid} from ${displayPath}: ${
        error instanceof Error ? error.message : error
      }`,
      { cause: error }
    );
  }
};

const warnAboutOrphanLifecycles = (
  strapi: Core.Strapi,
  schemas: LoadedComponents,
  lifecyclesFiles: LifecyclesFiles
) => {
  for (const category of Object.keys(lifecyclesFiles)) {
    for (const key of Object.keys(lifecyclesFiles[category])) {
      if (schemas[category]?.[key]) {
        continue;
      }

      // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
      const categoryDir = join(strapi.dirs.app.components, category);
      const filePath = join(categoryDir, lifecyclesFiles[category][key].filename);
      const expectedSchemaPath = join(categoryDir, `${key}.json`);

      strapi.log.warn(
        `Ignoring lifecycles file ${filePath}: no schema found for component "${category}.${key}" (expected ${expectedSchemaPath}).`
      );
    }
  }
};

/**
 * The lifecycles of a component: those declared inline in a `.js` schema, overridden hook by hook
 * by its lifecycles file, as the loader merged them before both were validated.
 */
const loadComponentLifecycles = (
  strapi: Core.Strapi,
  uid: string,
  schema: LoadedComponent,
  file: LifecyclesFiles[string][string] | undefined
) => {
  // NOTE: We're using the filepaths from the app directory instead of the dist for information purpose
  const appPath = (filename: string) => join(strapi.dirs.app.components, schema.category, filename);

  // `null` declared nothing, like a missing value
  const inline = schema.lifecycles ?? undefined;

  if (!file && inline === undefined) {
    return {};
  }

  let declared: unknown = inline;
  const sources = inline === undefined ? [] : [appPath(schema.__filename__)];

  if (file) {
    const fromFile = importLifecycles(uid, file.absolutePath, appPath(file.filename));
    sources.push(appPath(file.filename));

    if (inline !== undefined && !_.isObjectLike(inline)) {
      strapi.log.warn(
        `Component ${uid}: the inline "lifecycles" of ${appPath(
          schema.__filename__
        )} is not an object, it is ignored.`
      );
    }

    // The file wins hook by hook over the inline hooks. A file that is not an object is validated
    // as is, so that the error names it
    declared = _.isObjectLike(fromFile)
      ? { ...(_.isObjectLike(inline) ? (inline as object) : {}), ...(fromFile as object) }
      : fromFile;
  }

  const { lifecycles, warnings } = validateComponentLifecycles(uid, declared);

  if (warnings.length > 0) {
    strapi.log.warn(
      `Component ${uid} lifecycles (${sources.join(', ')}):\n- ${warnings.join('\n- ')}`
    );
  }

  return lifecycles;
};

export default async function loadComponents(strapi: Core.Strapi) {
  if (!(await pathExists(strapi.dirs.dist.components))) {
    return {};
  }

  const map = await loadFiles<LoadedComponents>(strapi.dirs.dist.components, '*/*.*(js|json)', {
    globArgs: { ignore: LIFECYCLES_FILES_PATTERN, nocase: true },
  });
  const lifecyclesFiles = await listLifecyclesFiles(strapi, strapi.dirs.dist.components);

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

      const lifecycles = loadComponentLifecycles(
        strapi,
        uid,
        { ...schema, category },
        lifecyclesFiles[category]?.[key]
      );

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

  warnAboutOrphanLifecycles(strapi, map, lifecyclesFiles);

  strapi.get('components').add(components);
}
