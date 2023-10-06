import os from 'os';

import { Logger } from './logger';
import { PackageJson } from './pkg';

/**
 * @description validate the `exports` property of the package.json against a set of rules.
 * If the validation fails, the process will throw with an appropriate error message. If
 * there is no `exports` property we check the standard export-like properties on the root
 * of the package.json.
 */
const validateExportsOrdering = async ({
  pkg,
  logger,
}: {
  pkg: PackageJson;
  logger: Logger;
}): Promise<PackageJson> => {
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

      if (exp.node) {
        const nodeKeys = Object.keys(exp.node);

        if (!assertOrder('module', 'import', nodeKeys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node.module' property should come before the 'node.import' property`
          );
        }

        if (!assertOrder('import', 'require', nodeKeys)) {
          logger.warn(
            `exports["${expPath}"]: the 'node.import' property should come before the 'node.require' property`
          );
        }

        if (!assertOrder('module', 'require', nodeKeys)) {
          logger.warn(
            `exports["${expPath}"]: the 'node.module' property should come before 'node.require' property`
          );
        }

        if (exp.import && exp.node.import && !assertOrder('node', 'import', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'import' property`
          );
        }

        if (exp.module && exp.node.module && !assertOrder('node', 'module', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'module' property`
          );
        }

        /**
         * If there's a `node.import` property but not a `node.require` we can assume `node.import`
         * is wrapping `import` and `node.module` should be added for bundlers.
         */
        if (
          exp.node.import &&
          (!exp.node.require || exp.require === exp.node.require) &&
          !exp.node.module
        ) {
          logger.warn(
            `exports["${expPath}"]: the 'node.module' property should be added so bundlers don't unintentionally try to bundle 'node.import'. Its value should be '"module": "${exp.import}"'`
          );
        }

        if (
          exp.node.import &&
          !exp.node.require &&
          exp.node.module &&
          exp.import &&
          exp.node.module !== exp.import
        ) {
          throw new Error(
            `exports["${expPath}"]: the 'node.module' property should match 'import'`
          );
        }

        if (exp.require && exp.node.require && exp.require === exp.node.require) {
          throw new Error(
            `exports["${expPath}"]: the 'node.require' property isn't necessary as it's identical to 'require'`
          );
        } else if (exp.require && exp.node.require && !assertOrder('node', 'require', keys)) {
          throw new Error(
            `exports["${expPath}"]: the 'node' property should come before the 'require' property`
          );
        }
      } else {
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

type Extensions = 'cjs' | 'es';

interface ExtMap {
  commonjs: Record<Extensions, string>;
  module: Record<Extensions, string>;
}

/**
 * @internal
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
} satisfies ExtMap;

/**
 * We potentially might need to support legacy exports or as package
 * development continues we have space to tweak this.
 */
const getExportExtensionMap = (): ExtMap => {
  return DEFAULT_PKG_EXT_MAP;
};

/**
 * @internal
 *
 * @description validate the `require` and `import` properties of a given exports maps from the package.json
 * returning if any errors are found.
 */
const validateExports = (
  _exports: Array<Export & { _path: string }>,
  options: { extMap: ExtMap; pkg: PackageJson }
) => {
  const { extMap, pkg } = options;
  const ext = extMap[pkg.type || 'commonjs'];

  const errors = [];

  for (const exp of _exports) {
    if (exp.require && !exp.require.endsWith(ext.cjs)) {
      errors.push(
        `package.json with 'type: "${pkg.type}"' - 'exports["${exp._path}"].require' must end with "${ext.cjs}"`
      );
    }

    if (exp.import && !exp.import.endsWith(ext.es)) {
      errors.push(
        `package.json with 'type: "${pkg.type}"' - 'exports["${exp._path}"].import' must end with "${ext.es}"`
      );
    }
  }

  return errors;
};

interface Export {
  types?: string;
  source: string;
  browser?: {
    source: string;
    import?: string;
    require?: string;
  };
  node?: {
    source?: string;
    module?: string;
    import?: string;
    require?: string;
  };
  module?: string;
  import?: string;
  require?: string;
  default: string;
}

/**
 * @description parse the exports map from the package.json into a standardised
 * format that we can use to generate build tasks from.
 */
const parseExports = ({ extMap, pkg }: { extMap: ExtMap; pkg: PackageJson }) => {
  const rootExport = {
    _path: '.',
    types: pkg.types,
    source: pkg.source || '',
    require: pkg.main,
    import: pkg.module,
    default: pkg.module || pkg.main || '',
  } satisfies Export & { _path: string };

  const extraExports: Export[] = [];

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

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const _exports = [
    /**
     * In the case of strapi plugins, we don't have a root export because we
     * ship a server side and client side package. So this can be completely omitted.
     */
    Object.values(rootExport).some((exp) => exp !== rootExport._path && Boolean(exp)) && rootExport,
    ...extraExports,
  ].filter((exp) => Boolean(exp)) as Array<Export & { _path: string }>;

  errors.push(...validateExports(_exports, { extMap, pkg }));

  if (errors.length) {
    throw new Error(`${os.EOL}- ${errors.join(`${os.EOL}- `)}`);
  }

  return _exports;
};

export { validateExportsOrdering, getExportExtensionMap, parseExports };
export type { ExtMap, Export, Extensions };
