/**
 * Utility functions for loading and validating package.json
 * this includes the specific validation of specific parts of
 * the package.json.
 */
import chalk from 'chalk';
import fs from 'fs/promises';
import os from 'os';
import pkgUp from 'pkg-up';
import * as yup from 'yup';

import { Logger } from './logger';

import type { Export } from './exports';

const record = (value: unknown) =>
  yup
    .object(
      typeof value === 'object' && value
        ? Object.entries(value).reduce<Record<string, yup.SchemaOf<string>>>((acc, [key]) => {
            acc[key] = yup.string().required();

            return acc;
          }, {})
        : {}
    )
    .optional();

/**
 * The schema for the package.json that we expect,
 * currently pretty loose.
 */
const packageJsonSchema = yup.object({
  name: yup.string().required(),
  version: yup.string().required(),
  description: yup.string().optional(),
  author: yup.lazy((value) => {
    if (typeof value === 'object') {
      return yup
        .object({
          name: yup.string().required(),
          email: yup.string().optional(),
          url: yup.string().optional(),
        })
        .optional();
    }

    return yup.string().optional();
  }),
  keywords: yup.array(yup.string()).optional(),
  type: yup.mixed().oneOf(['commonjs', 'module']).optional(),
  license: yup.string().optional(),
  repository: yup
    .object({
      type: yup.string().required(),
      url: yup.string().required(),
    })
    .optional(),
  bugs: yup
    .object({
      url: yup.string().required(),
    })
    .optional(),
  homepage: yup.string().optional(),
  // TODO: be nice just to make this either a string or a record of strings.
  bin: yup.lazy((value) => {
    if (typeof value === 'object') {
      return record(value);
    }

    return yup.string().optional();
  }),
  // TODO: be nice just to make this either a string or a record of strings.
  browser: yup.lazy((value) => {
    if (typeof value === 'object') {
      return record(value);
    }

    return yup.string().optional();
  }),
  main: yup.string().optional(),
  module: yup.string().optional(),
  source: yup.string().optional(),
  types: yup.string().optional(),
  exports: yup.lazy((value) =>
    yup
      .object(
        typeof value === 'object'
          ? Object.entries(value).reduce((acc, [key, value]) => {
              if (typeof value === 'object') {
                // @ts-expect-error yup is not typed correctly
                acc[key] = yup
                  .object({
                    types: yup.string().optional(),
                    source: yup.string().required(),
                    browser: yup
                      .object({
                        source: yup.string().required(),
                        import: yup.string().optional(),
                        require: yup.string().optional(),
                      })
                      .optional(),
                    node: yup
                      .object({
                        source: yup.string().optional(),
                        module: yup.string().optional(),
                        import: yup.string().optional(),
                        require: yup.string().optional(),
                      })
                      .optional(),
                    module: yup.string().optional(),
                    import: yup.string().optional(),
                    require: yup.string().optional(),
                    default: yup.string().required(),
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
      .optional()
  ),
  files: yup.array(yup.string()).optional(),
  scripts: yup.lazy(record),
  dependencies: yup.lazy(record),
  devDependencies: yup.lazy(record),
  peerDependencies: yup.lazy(record),
  engines: yup.lazy(record),
  browserslist: yup.array(yup.string().required()).optional(),
});

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async ({ cwd, logger }: { cwd: string; logger: Logger }): Promise<object> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fs.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};

interface PackageJson extends Omit<yup.Asserts<typeof packageJsonSchema>, 'type'> {
  type?: 'commonjs' | 'module';
}

/**
 * @description validate the package.json against a standardised schema using `yup`.
 * If the validation fails, the process will throw with an appropriate error message.
 */
const validatePkg = async ({ pkg }: { pkg: object }): Promise<PackageJson> => {
  try {
    const validatedPkg = await packageJsonSchema.validate(pkg, {
      strict: true,
    });

    return validatedPkg;
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      switch (err.type) {
        case 'required':
          if (err.path) {
            throw new Error(
              `'${err.path}' in 'package.json' is required as type '${chalk.magenta(
                yup.reach(packageJsonSchema, err.path).type
              )}'`
            );
          }
          break;
        case 'matches':
          if (err.params && err.path && 'value' in err.params && 'regex' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
                err.params.regex
              )}' (recieved the value '${chalk.magenta(err.params.value)}')`
            );
          }
          break;
        /**
         * This will only be thrown if there are keys in the export map
         * that we don't expect so we can therefore make some assumptions
         */
        case 'noUnknown':
          if (err.path && err.params && 'unknown' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' contains the unknown key ${chalk.magenta(
                err.params.unknown
              )}, for compatability only the following keys are allowed: ${chalk.magenta(
                "['types', 'source', 'import', 'require', 'default']"
              )}`
            );
          }
          break;
        default:
          if (err.path && err.params && 'type' in err.params && 'value' in err.params) {
            throw new Error(
              `'${err.path}' in 'package.json' must be of type '${chalk.magenta(
                err.params.type
              )}' (recieved '${chalk.magenta(typeof err.params.value)}')`
            );
          }
      }
    }

    throw err;
  }
};

export { loadPkg, validatePkg };
export type { PackageJson };
