import fs from 'node:fs';
import path from 'node:path';

import { APP_NODE_ENV } from '../app/config';
import type { App } from '../app/generate';

/**
 * Scaffolders write content types, components and config into a generated app, before its
 * server starts: Strapi syncs them on boot, so a whole setup costs one boot instead of one per
 * step (the old builder in packages/utils/api-tests booted Strapi for each action).
 *
 * They are idempotent: scaffolding the same thing twice rewrites the same file. To change the
 * schema of a running server, scaffold then restart it.
 */

type Attributes = Record<string, Record<string, unknown>>;

export interface ContentTypeDefinition {
  /** Gives the uid `api::<singularName>.<singularName>`. */
  singularName: string;
  pluralName?: string;
  displayName?: string;
  kind?: 'collectionType' | 'singleType';
  collectionName?: string;
  /** Default: false. */
  draftAndPublish?: boolean;
  /** For example `{ i18n: { localized: true } }`. */
  pluginOptions?: Record<string, unknown>;
  attributes: Attributes;
}

export interface ComponentDefinition {
  /** `<category>.<name>`, for example `default.address`. */
  uid: string;
  displayName?: string;
  attributes: Attributes;
}

const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

const toTitle = (name: string) =>
  name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Write a content type to `src/api/<name>`: its schema, and the core router, controller and
 * service, so its Content API routes exist. Returns its uid.
 */
export const scaffoldContentType = (app: App, definition: ContentTypeDefinition): string => {
  const {
    singularName,
    pluralName = `${singularName}s`,
    displayName = toTitle(singularName),
    kind = 'collectionType',
    collectionName = pluralName.replace(/-/g, '_'),
    draftAndPublish = false,
    pluginOptions = {},
    attributes,
  } = definition;

  if (!KEBAB_CASE.test(singularName) || !KEBAB_CASE.test(pluralName)) {
    throw new Error(`Content type names must be kebab-case: ${singularName}, ${pluralName}.`);
  }

  const uid = `api::${singularName}.${singularName}`;
  const apiDir = path.join(app.dir, 'src', 'api', singularName);

  writeJson(path.join(apiDir, 'content-types', singularName, 'schema.json'), {
    kind,
    collectionName,
    info: { singularName, pluralName, displayName },
    options: { draftAndPublish },
    pluginOptions,
    attributes,
  });

  for (const [folder, factory] of [
    ['routes', 'createCoreRouter'],
    ['controllers', 'createCoreController'],
    ['services', 'createCoreService'],
  ]) {
    const file = path.join(apiDir, folder, `${singularName}.js`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(
      file,
      `'use strict';\n\nconst { factories } = require('@strapi/strapi');\n\nmodule.exports = factories.${factory}(${JSON.stringify(uid)});\n`
    );
  }

  return uid;
};

/** Write a component to `src/components/<category>/<name>.json`. Returns its uid. */
export const scaffoldComponent = (app: App, definition: ComponentDefinition): string => {
  const { uid, attributes } = definition;
  const [category, name, ...rest] = uid.split('.');

  if (
    !category ||
    !name ||
    rest.length > 0 ||
    !KEBAB_CASE.test(category) ||
    !KEBAB_CASE.test(name)
  ) {
    throw new Error(`Component uids are "<category>.<name>" in kebab-case, got "${uid}".`);
  }

  writeJson(path.join(app.dir, 'src', 'components', category, `${name}.json`), {
    collectionName: `components_${category}_${name}s`.replace(/-/g, '_'),
    info: { displayName: definition.displayName ?? toTitle(name) },
    options: {},
    attributes,
  });

  return uid;
};

type ConfigValue = Record<string, unknown>;

const isObject = (value: unknown): value is ConfigValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Deep merge where arrays and other values replace what was there. */
const merge = (target: ConfigValue, source: ConfigValue): ConfigValue => {
  const result: ConfigValue = { ...target };
  for (const [key, value] of Object.entries(source)) {
    result[key] = isObject(value) && isObject(result[key]) ? merge(result[key], value) : value;
  }
  return result;
};

const CONFIG_PREFIX = 'module.exports = ';

/** Read back what `scaffoldConfig` wrote for a config file, `{}` when nothing was. */
export const readScaffoldedConfig = (app: App, name: string): ConfigValue => {
  const file = path.join(app.dir, 'config', 'env', APP_NODE_ENV, `${name}.js`);
  if (!fs.existsSync(file)) {
    return {};
  }
  return JSON.parse(
    fs.readFileSync(file, 'utf8').slice(CONFIG_PREFIX.length).replace(/;\s*$/, '')
  ) as ConfigValue;
};

/**
 * Set config of the app, for example `scaffoldConfig(app, 'features', { future: { adminTokens:
 * true } })` or `scaffoldConfig(app, 'server', { mcp: { enabled: true } })`.
 *
 * Writes `config/env/<NODE_ENV>/<name>.js`, which Strapi merges over the generated
 * `config/<name>.js` (`.js` because Strapi reads `plugins` from a `.js` file only). Calls on the
 * same file merge; arrays are replaced, not merged.
 */
export const scaffoldConfig = (app: App, name: string, values: ConfigValue) => {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) {
    throw new Error(`Config file names are alphanumeric, got "${name}".`);
  }
  const file = path.join(app.dir, 'config', 'env', APP_NODE_ENV, `${name}.js`);
  const current = readScaffoldedConfig(app, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${CONFIG_PREFIX}${JSON.stringify(merge(current, values), null, 2)};\n`);
};

export interface PluginDefinition {
  /** Default: true. */
  enabled?: boolean;
  config?: ConfigValue;
  /** Path of a local plugin. */
  resolve?: string;
}

/** Enable or configure a plugin (`config/env/<NODE_ENV>/plugins.js`). */
export const scaffoldPlugin = (
  app: App,
  name: string,
  { enabled = true, config, resolve }: PluginDefinition = {}
) => {
  scaffoldConfig(app, 'plugins', {
    [name]: { enabled, ...(config ? { config } : {}), ...(resolve ? { resolve } : {}) },
  });
};
