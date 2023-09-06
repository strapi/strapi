'use strict';

const fs = require('fs/promises');
const path = require('path');
const chalk = require('chalk');
const yup = require('yup');

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
  type: yup.string().matches(/(commonjs|module)/),
  license: yup.string(),
  bin: yup.mixed().oneOf([
    yup.string(),
    yup.object({
      [yup.string()]: yup.string(),
    }),
  ]),
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
          }, {})
        : undefined
    )
  ),
  files: yup.array(yup.string()),
  scripts: yup.object(),
  dependencies: yup.object(),
  devDependencies: yup.object(),
  peerDependencies: yup.object(),
  engines: yup.object(),
});

/**
 * @typedef {import('yup').Asserts<typeof packageJsonSchema>} PackageJson
 */

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 *
 * @type {(args: { cwd: string, logger: import('./logger').Logger }) => Promise<object>}
 */
const loadPkg = async ({ cwd, logger }) => {
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
 *
 * @type {(args: { pkg: object }) => Promise<PackageJson | null>}
 */
const validatePkg = async ({ pkg }) => {
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
              yup.reach(packageJsonSchema, err.path).type
            )}'`
          );
        case 'matches':
          throw new Error(
            `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
              err.params.regex
            )}' (recieved the value '${chalk.magenta(err.params.value)}')`
          );
        /**
         * This will only be thrown if there are keys in the export map
         * that we don't expect so we can therefore make some assumptions
         */
        case 'noUnknown':
          throw new Error(
            `'${err.path}' in 'package.json' contains the unknown key ${chalk.magenta(
              err.params.unknown
            )}, for compatability only the following keys are allowed: ${chalk.magenta(
              "['types', 'source', 'import', 'require', 'default']"
            )}`
          );
        default:
          throw new Error(
            `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
              err.params.type
            )}' (recieved '${chalk.magenta(typeof err.params.value)}')`
          );
      }
    }

    throw err;
  }
};

/**
 * @description validate the `exports` property of the package.json against a set of rules.
 * If the validation fails, the process will throw with an appropriate error message. If
 * there is no `exports` property we check the standard export-like properties on the root
 * of the package.json.
 *
 * @type {(args: { pkg: object, logger: import('./logger').Logger }) => Promise<PackageJson>}
 */
const validateExportsOrdering = async ({ pkg, logger }) => {
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
function assertFirst(key, arr) {
  const aIdx = arr.indexOf(key);

  // if not found, then we don't care
  if (aIdx === -1) {
    return true;
  }

  return aIdx === 0;
}

/** @internal */
function assertLast(key, arr) {
  const aIdx = arr.indexOf(key);

  // if not found, then we don't care
  if (aIdx === -1) {
    return true;
  }

  return aIdx === arr.length - 1;
}

/** @internal */
function assertOrder(keyA, keyB, arr) {
  const aIdx = arr.indexOf(keyA);
  const bIdx = arr.indexOf(keyB);

  // if either is not found, then we don't care
  if (aIdx === -1 || bIdx === -1) {
    return true;
  }

  return aIdx < bIdx;
}

/**
 * @typedef {Object} Extensions
 * @property {string} commonjs
 * @property {string} esm
 */

/**
 * @typedef {Object} ExtMap
 * @property {Extensions} commonjs
 * @property {Extensions} esm
 */

/**
 * @internal
 *
 * @type {ExtMap}
 */
const DEFAULT_PKG_EXT_MAP = {
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
 * @type {() => ExtMap}
 */
const getExportExtensionMap = () => {
  return DEFAULT_PKG_EXT_MAP;
};

/**
 * @internal
 *
 * @description validate the `require` and `import` properties of a given exports maps from the package.json
 * returning if any errors are found.
 *
 * @type {(_exports: unknown, options: {extMap: ExtMap; pkg: PackageJson}) => string[]}
 */
const validateExports = (_exports, options) => {
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

/**
 * @typedef {Object} Export
 * @property {string} _path the path of the export, `.` for the root.
 * @property {string=} types the path to the types file
 * @property {string} source the path to the source file
 * @property {string=} require the path to the commonjs require file
 * @property {string=} import the path to the esm import file
 * @property {string=} default the path to the default file
 */

/**
 * @description parse the exports map from the package.json into a standardised
 * format that we can use to generate build tasks from.
 *
 * @type {(args: { extMap: ExtMap, pkg: PackageJson }) => Export[]}
 */
const parseExports = ({ extMap, pkg }) => {
  /**
   * @type {Export}
   */
  const rootExport = {
    _path: '.',
    types: pkg.types,
    source: pkg.source,
    require: pkg.main,
    import: pkg.module,
    default: pkg.module || pkg.main,
  };

  /**
   * @type {Export[]}
   */
  const extraExports = [];

  /**
   * @type {string[]}
   */
  const errors = [];

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

  const _exports = [
    /**
     * In the case of strapi plugins, we don't have a root export because we
     * ship a server side and client side package. So this can be completely omitted.
     */
    Object.values(rootExport).some((exp) => exp !== rootExport._path && Boolean(exp)) && rootExport,
    ...extraExports,
  ].filter(Boolean);

  errors.push(...validateExports(_exports, { extMap, pkg }));

  if (errors.length) {
    throw new Error(`\n- ${errors.join('\n- ')}`);
  }

  return _exports;
};

module.exports = {
  loadPkg,
  validatePkg,
  validateExportsOrdering,
  getExportExtensionMap,
  parseExports,
};
