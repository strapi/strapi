import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative } from 'node:path';

import type { Schema } from '@strapi/types';

import { fromDisk } from './sources';
import type { AppComponent, AppContentType, AppInput } from './types';
import { printDefineAppSource } from './print-define-app-source';

const FACTORY_BOILERPLATE =
  /factories\.createCore(?:Router|Controller|Service)\s*\(\s*['"`][^'"`]+['"`]\s*\)/;

const isDirectory = (path: string): boolean => existsSync(path) && statSync(path).isDirectory();

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

interface FileSchema {
  kind?: 'collectionType' | 'singleType';
  collectionName?: string;
  info: {
    singularName?: string;
    pluralName?: string;
    displayName?: string;
    description?: string;
    icon?: string;
  };
  options?: Record<string, unknown>;
  pluginOptions?: Record<string, unknown>;
  attributes?: Record<string, Record<string, unknown>>;
}

const stripType = (attribute: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(attribute).filter(([key]) => key !== 'type'));

/**
 * Convert a file-based attribute object into the plain shape accepted by
 * {@link AppContentType.attributes} (type + options, no builder call).
 */
export const convertFileAttribute = (
  attribute: Record<string, unknown>
): Schema.Attribute.AnyAttribute => {
  const { type } = attribute;
  if (typeof type !== 'string') {
    throw new TypeError('Each attribute requires a `type` field');
  }
  return { type, ...stripType(attribute) } as Schema.Attribute.AnyAttribute;
};

const convertAttributes = (
  attributes: Record<string, Record<string, unknown>> | undefined
): Record<string, Schema.Attribute.AnyAttribute> => {
  if (!attributes) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(attributes).map(([name, attr]) => [name, convertFileAttribute(attr)])
  );
};

const isFactoryBoilerplate = (filePath: string): boolean => {
  if (!existsSync(filePath)) {
    return false;
  }
  const source = readFileSync(filePath, 'utf8');
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '').trim();
  return FACTORY_BOILERPLATE.test(withoutComments);
};

const listFiles = (dir: string, extensions: string[]): string[] => {
  if (!isDirectory(dir)) {
    return [];
  }

  return readdirSync(dir).filter((name) => extensions.includes(extname(name)));
};

const apiHasCustomCode = (apiDir: string): boolean => {
  for (const sub of ['routes', 'controllers', 'services', 'policies', 'middlewares'] as const) {
    const subDir = join(apiDir, sub);
    for (const file of listFiles(subDir, ['.js', '.ts', '.jsx', '.tsx'])) {
      if (!isFactoryBoilerplate(join(subDir, file))) {
        return true;
      }
    }
  }
  return false;
};

const scanContentTypes = (
  projectRoot: string,
  warnings: string[]
): { contentTypes: AppContentType[]; customApiNames: string[] } => {
  const apiRoot = join(projectRoot, 'src', 'api');
  const contentTypes: AppContentType[] = [];
  const customApiNames: string[] = [];

  if (!isDirectory(apiRoot)) {
    return { contentTypes, customApiNames };
  }

  for (const apiName of readdirSync(apiRoot).filter((name) => isDirectory(join(apiRoot, name)))) {
    const apiDir = join(apiRoot, apiName);

    if (apiHasCustomCode(apiDir)) {
      customApiNames.push(apiName);
      warnings.push(
        `API "${apiName}" has custom routes/controllers/services — keep them on disk via \`from: fromDisk('.')\` or \`contentTypes: fromDisk('./src/api/${apiName}')\`.`
      );
    }

    const ctRoot = join(apiDir, 'content-types');
    if (isDirectory(ctRoot)) {
      for (const ctFolder of readdirSync(ctRoot)) {
        const schemaPath = join(ctRoot, ctFolder, 'schema.json');
        if (!existsSync(schemaPath)) {
          // skip folders without schema.json
        } else {
          const schema = readJson<FileSchema>(schemaPath);
          const { singularName, pluralName, displayName } = schema.info ?? {};

          if (!singularName || !pluralName || !displayName) {
            warnings.push(
              `Skipped ${schemaPath}: missing singularName, pluralName, or displayName`
            );
          } else {
            const ct: AppContentType = {
              singularName,
              pluralName,
              displayName,
              attributes: convertAttributes(schema.attributes),
            };

            if (schema.kind && schema.kind !== 'collectionType') {
              ct.kind = schema.kind;
            }
            if (schema.collectionName) {
              ct.collectionName = schema.collectionName;
            }
            if (schema.info.description) {
              ct.description = schema.info.description;
            }
            if (schema.options && Object.keys(schema.options).length > 0) {
              ct.options = schema.options;
            }
            if (schema.pluginOptions && Object.keys(schema.pluginOptions).length > 0) {
              ct.pluginOptions = schema.pluginOptions;
            }
            if (apiName !== singularName) {
              ct.apiName = apiName;
            }

            contentTypes.push(ct);
          }
        }
      }
    }
  }

  return { contentTypes, customApiNames };
};

const scanComponents = (projectRoot: string): AppComponent[] => {
  const componentsRoot = join(projectRoot, 'src', 'components');
  const components: AppComponent[] = [];

  if (!isDirectory(componentsRoot)) {
    return components;
  }

  for (const category of readdirSync(componentsRoot).filter((name) =>
    isDirectory(join(componentsRoot, name))
  )) {
    const categoryDir = join(componentsRoot, category);

    for (const file of readdirSync(categoryDir).filter((name) => name.endsWith('.json'))) {
      const name = basename(file, '.json');
      const schema = readJson<FileSchema>(join(categoryDir, file));
      const displayName = schema.info?.displayName;

      if (displayName) {
        const component: AppComponent = {
          uid: `${category}.${name}`,
          displayName,
          attributes: convertAttributes(schema.attributes),
        };

        if (schema.collectionName) {
          component.collectionName = schema.collectionName;
        }
        if (schema.info.description) {
          component.description = schema.info.description;
        }
        if (schema.info.icon) {
          component.icon = schema.info.icon;
        }
        if (schema.options && Object.keys(schema.options).length > 0) {
          component.options = schema.options;
        }

        components.push(component);
      }
    }
  }

  return components;
};

const hasNonEmptyPluginsConfig = (projectRoot: string): boolean => {
  const configDir = join(projectRoot, 'config');
  const pluginsPath = ['.ts', '.js']
    .map((ext) => join(configDir, `plugins${ext}`))
    .find((path) => existsSync(path));

  if (!pluginsPath) {
    return false;
  }

  const source = readFileSync(pluginsPath, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  return !/^\s*(?:export\s+default|module\.exports\s*=)\s*\(\s*\)\s*=>\s*\(\s*\{\s*\}\s*\)\s*;?\s*$/m.test(
    source.trim()
  );
};

const hasLifecycleHooks = (projectRoot: string): boolean => {
  const indexPath = ['.ts', '.js']
    .map((ext) => join(projectRoot, 'src', `index${ext}`))
    .find((path) => existsSync(path));

  if (!indexPath) {
    return false;
  }

  const source = readFileSync(indexPath, 'utf8');
  return /(?:register|bootstrap|destroy)\s*\([^)]*\)\s*\{[^}]+\}/.test(source);
};

const hasDiskPolicies = (projectRoot: string): boolean =>
  listFiles(join(projectRoot, 'src', 'policies'), ['.js', '.ts']).length > 0;

const hasDiskMiddlewares = (projectRoot: string): boolean =>
  listFiles(join(projectRoot, 'src', 'middlewares'), ['.js', '.ts']).length > 0;

const rel = (projectRoot: string, target: string): string => {
  const path = relative(projectRoot, target) || '.';
  return path.startsWith('.') ? path : `./${path}`;
};

export interface ScaffoldToDefineAppOptions {
  /** Absolute path to the scaffolded Strapi project root. */
  projectRoot: string;
}

export interface ScaffoldToDefineAppResult {
  /** {@link AppInput} ready to pass to {@link defineApp}. */
  definition: AppInput;
  /** Generated TypeScript source for a single `app.ts` module. */
  source: string;
  /** Non-fatal notes about resources left on disk or skipped during conversion. */
  warnings: string[];
}

/**
 * Read a scaffolded (file-based) Strapi project and produce a programmatic
 * {@link AppInput} plus generated TypeScript source for a single `defineApp`
 * module.
 *
 * Content types and components are inlined from `schema.json` files; config,
 * plugins, policies, middlewares, and lifecycles that cannot be statically
 * inlined are referenced explicitly via `fromDisk(...)` or the top-level
 * `from` fallback — no implicit disk loading.
 */
export const scaffoldToDefineApp = (
  options: ScaffoldToDefineAppOptions
): ScaffoldToDefineAppResult => {
  const { projectRoot } = options;
  const warnings: string[] = [];

  if (!isDirectory(projectRoot)) {
    throw new Error(`scaffoldToDefineApp: not a directory: ${projectRoot}`);
  }

  const { contentTypes } = scanContentTypes(projectRoot, warnings);
  const components = scanComponents(projectRoot);

  const definition: AppInput = {};

  if (existsSync(join(projectRoot, 'config'))) {
    definition.config = fromDisk(rel(projectRoot, join(projectRoot, 'config')));
  }

  if (hasNonEmptyPluginsConfig(projectRoot)) {
    definition.plugins = fromDisk('.');
  } else {
    warnings.push(
      'Empty `config/plugins` — generated source uses `recommendedPlugins()`; set `plugins: fromDisk()` manually to preserve legacy discovery.'
    );
  }

  if (contentTypes.length > 0) {
    definition.contentTypes = contentTypes;
  }

  if (components.length > 0) {
    definition.components = components;
  }

  if (hasDiskPolicies(projectRoot)) {
    definition.policies = fromDisk(rel(projectRoot, join(projectRoot, 'src', 'policies')));
  }

  if (hasDiskMiddlewares(projectRoot)) {
    definition.middlewares = fromDisk(rel(projectRoot, join(projectRoot, 'src', 'middlewares')));
  }

  const needsFromFallback =
    hasLifecycleHooks(projectRoot) ||
    hasDiskPolicies(projectRoot) ||
    hasDiskMiddlewares(projectRoot) ||
    warnings.some((w) => w.includes('custom routes'));

  if (needsFromFallback) {
    definition.from = fromDisk('.');
  }

  const source = printDefineAppSource(definition, {
    useRecommendedPlugins: !hasNonEmptyPluginsConfig(projectRoot),
    warnings,
  });

  return { definition, source, warnings };
};
