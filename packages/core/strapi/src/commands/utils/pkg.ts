import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import * as yup from 'yup';
import type { Logger } from './logger';

export type PackageJson = yup.Asserts<typeof packageJsonSchema>;

export type Extensions = 'commonjs' | 'module';
export type ExtMap = {
  [key in Extensions]: {
    cjs: string;
    es: string;
  };
};

export interface Export {
  types?: string;
  source?: string;
  require?: string;
  import?: string;
  default?: string;
}

export interface ExportWithMeta extends Export {
  _path: string;
}

/**
 * Utility functions for loading and validating package.json
 * this includes the specific validation of specific parts of
 * the package.json.
 */

/**
 * The schema for the package.json that we expect,
 * currently pretty loose.
 */
const packageJsonSchema = yup.object({
  name: yup.string().required(),
  version: yup.string().required(),
  type: yup.mixed().oneOf(['commonjs', 'module']) as yup.SchemaOf<Extensions>,
  license: yup.string(),
  bin: yup.lazy((value) =>
    typeof value === 'object'
      ? yup.object(
          Object.entries(value).reduce((acc, [key]) => {
            acc[key] = yup.string().required();

            return acc;
          }, {} as Record<string, yup.SchemaOf<string>>)
        )
      : yup.string()
  ),
  main: yup.string(),
  module: yup.string(),
  source: yup.string(),
  types: yup.string(),
  exports: yup.lazy((value) =>
    yup.object(
      typeof value === 'object'
        ? Object.entries(value).reduce((acc, [key, value]) => {
            if (typeof value === 'object') {
              acc[key] = yup
                .object({
                  types: yup.string(),
                  source: yup.string(),
                  import: yup.string(),
                  require: yup.string(),
                  default: yup.string(),
                })
                .noUnknown(true);
            } else {
              acc[key] = yup
                .string()
                .matches(/^\.\/.*\.json$/)
                .required();
            }

            return acc;
          }, {} as Record<string, yup.SchemaOf<string> | yup.SchemaOf<Export>>)
        : undefined
    )
  ),
  files: yup.array(yup.string()),
  scripts: yup.object(),
  dependencies: yup.object(),
  devDependencies: yup.object(),
  peerDependencies: yup.object(),
  engines: yup.object(),
  browserslist: yup.array(yup.string().required()),
});

interface LoadPkgOptions {
  cwd: string;
  logger: Logger;
}

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 *
 */
const loadPkg = async ({ cwd, logger }: LoadPkgOptions): Promise<PackageJson> => {
  const directory = path.resolve(cwd);

  const pkgPath = path.join(directory, 'package.json');

  const buffer = await fs.readFile(pkgPath).catch((err) => {
    logger.debug(err);
    throw new Error('Could not find a package.json in the current directory');
  });

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json: \n', pkg);

  return pkg;
};

/**
 * @description validate the package.json against a standardised schema using `yup`.
 * If the validation fails, the process will throw with an appropriate error message.
 */
const validatePkg = async ({ pkg }: { pkg: PackageJson }) => {
  try {
    const validatedPkg = await packageJsonSchema.validate(pkg, {
      strict: true,
    });

    return validatedPkg;
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      switch (err.type) {
        case 'required':
          throw new Error(
            `'${err.path}' in 'package.json' is required as type '${chalk.magenta(
              yup.reach(packageJsonSchema, err.path ?? '').type
            )}'`
          );
        case 'matches':
          throw new Error(
            `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
              err.params?.regex
            )}' (recieved the value '${chalk.magenta(err.params?.value)}')`
          );
        /**
         * This will only be thrown if there are keys in the export map
         * that we don't expect so we can therefore make some assumptions
         */
        case 'noUnknown':
          throw new Error(
            `'${err.path}' in 'package.json' contains the unknown key ${chalk.magenta(
              err.params?.unknown
            )}, for compatability only the following keys are allowed: ${chalk.magenta(
              "['types', 'source', 'import', 'require', 'default']"
            )}`
          );
        default:
          throw new Error(
            `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
              err.params?.type
            )}' (recieved '${chalk.magenta(typeof err.params?.value)}')`
          );
      }
    }

    throw err;
  }
};

interface ValidateExportsOrderingOptions {
  pkg: PackageJson;
  logger: Logger;
}

/**
 * @description validate the `exports` property of the package.json against a set of rules.
 * If the validation fails, the process will throw with an appropriate error message. If
 * there is no `exports` property we check the standard export-like properties on the root
 * of the package.json.
 */
const validateExportsOrdering = async ({
  pkg,
  logger,
}: ValidateExportsOrderingOptions): Promise<PackageJson> => {
  if (pkg.exports) {
    const exports = Object.entries(pkg.exports);

    for (const [expPath, exp] of exports) {
      if (typeof exp === 'string') {
        // eslint-disable-next-line no-continue
        continue;
      }

      const keys = Object.keys(exp);

      if (!assertFirst('types', keys)) {
        throw new Error(`exports["${expPath}"]: the 'types' property should be the first property`);
      }

      if (!assertOrder('import', 'require', keys)) {
        logger.warn(
          `exports["${expPath}"]: the 'import' property should come before the 'require' property`
        );
      }

      if (!assertOrder('module', 'import', keys)) {
        logger.warn(
          `exports["${expPath}"]: the 'module' property should come before 'import' property`
        );
      }

      if (!assertLast('default', keys)) {
        throw new Error(
          `exports["${expPath}"]: the 'default' property should be the last property`
        );
      }
    }
  } else if (!['main', 'module'].some((key) => Object.prototype.hasOwnProperty.call(pkg, key))) {
    throw new Error(`'package.json' must contain a 'main' and 'module' property`);
  }

  return pkg;
};

/** @internal */
function assertFirst(key: string, arr: string[]) {
  const aIdx = arr.indexOf(key);

  // if not found, then we don't care
  if (aIdx === -1) {
    return true;
  }

  return aIdx === 0;
}

/** @internal */
function assertLast(key: string, arr: string[]) {
  const aIdx = arr.indexOf(key);

  // if not found, then we don't care
  if (aIdx === -1) {
    return true;
  }

  return aIdx === arr.length - 1;
}

/** @internal */
function assertOrder(keyA: string, keyB: string, arr: string[]) {
  const aIdx = arr.indexOf(keyA);
  const bIdx = arr.indexOf(keyB);

  // if either is not found, then we don't care
  if (aIdx === -1 || bIdx === -1) {
    return true;
  }

  return aIdx < bIdx;
}

/**
 * @internal
 */
const DEFAULT_PKG_EXT_MAP: ExtMap = {
  // pkg.type: "commonjs"
  commonjs: {
    cjs: '.js',
    es: '.mjs',
  },

  // pkg.type: "module"
  module: {
    cjs: '.cjs',
    es: '.js',
  },
};

/**
 * We potentially might need to support legacy exports or as package
 * development continues we have space to tweak this.
 *
 */
const getExportExtensionMap = (): ExtMap => {
  return DEFAULT_PKG_EXT_MAP;
};

interface ValidateExportsOptions {
  extMap: ExtMap;
  pkg: PackageJson;
}

/**
 * @internal
 *
 * @description validate the `require` and `import` properties of a given exports maps from the package.json
 * returning if any errors are found.
 *
 */
const validateExports = (_exports: ExportWithMeta[], options: ValidateExportsOptions): string[] => {
  const { extMap, pkg } = options;
  const ext = extMap[pkg.type || 'commonjs'];

  const errors = [];

  for (const exp of _exports) {
    if (exp.require && !exp.require.endsWith(ext.cjs)) {
      errors.push(
        `package.json with \`type: "${pkg.type}"\` - \`exports["${exp._path}"].require\` must end with "${ext.cjs}"`
      );
    }

    if (exp.import && !exp.import.endsWith(ext.es)) {
      errors.push(
        `package.json with \`type: "${pkg.type}"\` - \`exports["${exp._path}"].import\` must end with "${ext.es}"`
      );
    }
  }

  return errors;
};

interface ParseExportsOptions {
  extMap: ExtMap;
  pkg: PackageJson;
}

/**
 * @description parse the exports map from the package.json into a standardised
 * format that we can use to generate build tasks from.
 */
const parseExports = ({ extMap, pkg }: ParseExportsOptions): ExportWithMeta[] => {
  const rootExport: ExportWithMeta = {
    _path: '.',
    types: pkg.types,
    source: pkg.source,
    require: pkg.main,
    import: pkg.module,
    default: pkg.module || pkg.main,
  };

  const extraExports: ExportWithMeta[] = [];

  const errors: string[] = [];

  if (pkg.exports) {
    if (!pkg.exports['./package.json']) {
      errors.push('package.json: `exports["./package.json"] must be declared.');
    }

    Object.entries(pkg.exports).forEach(([path, entry]) => {
      if (path.endsWith('.json')) {
        if (path === './package.json' && entry !== './package.json') {
          errors.push(`package.json: 'exports["./package.json"]' must be './package.json'.`);
        }
      } else if (Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)) {
        if (path === '.') {
          if (entry.require && rootExport.require && entry.require !== rootExport.require) {
            errors.push(
              `package.json: mismatch between 'main' and 'exports.require'. These must be equal.`
            );
          }

          if (entry.import && rootExport.import && entry.import !== rootExport.import) {
            errors.push(
              `package.json: mismatch between 'module' and 'exports.import' These must be equal.`
            );
          }

          if (entry.types && rootExport.types && entry.types !== rootExport.types) {
            errors.push(
              `package.json: mismatch between 'types' and 'exports.types'. These must be equal.`
            );
          }

          if (entry.source && rootExport.source && entry.source !== rootExport.source) {
            errors.push(
              `package.json: mismatch between 'source' and 'exports.source'. These must be equal.`
            );
          }

          Object.assign(rootExport, entry);
        } else {
          const extraExport = {
            _exported: true,
            _path: path,
            ...entry,
          };

          extraExports.push(extraExport);
        }
      } else {
        errors.push('package.json: exports must be an object');
      }
    });
  }

  const _exports: ExportWithMeta[] = [
    /**
     * In the case of strapi plugins, we don't have a root export because we
     * ship a server side and client side package. So this can be completely omitted.
     */
    Object.values(rootExport).some((exp) => exp !== rootExport._path && Boolean(exp)) && rootExport,
    ...extraExports,
  ].filter((v): v is ExportWithMeta => Boolean(v));

  errors.push(...validateExports(_exports, { extMap, pkg }));

  if (errors.length) {
    throw new Error(`\n- ${errors.join('\n- ')}`);
  }

  return _exports;
};

export { loadPkg, validatePkg, validateExportsOrdering, getExportExtensionMap, parseExports };
