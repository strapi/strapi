import * as fse from 'fs-extra';
import os from 'os';
import pkgUp from 'pkg-up';
import * as yup from 'yup';
import chalk from 'chalk';
import { Logger } from '../services/logger';

interface Export {
  types?: string;
  source: string;
  module?: string;
  import?: string;
  require?: string;
  default: string;
}

const packageJsonSchema = yup.object({
  name: yup.string().required(),
  exports: yup.lazy((value) =>
    yup
      .object(
        typeof value === 'object'
          ? Object.entries(value).reduce(
              (acc, [key, value]) => {
                if (typeof value === 'object') {
                  acc[key] = yup
                    .object({
                      types: yup.string().optional(),
                      source: yup.string().required(),
                      module: yup.string().optional(),
                      import: yup.string().required(),
                      require: yup.string().required(),
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
              },
              {} as Record<string, yup.SchemaOf<string> | yup.SchemaOf<Export>>
            )
          : undefined
      )
      .optional()
  ),
});

type PackageJson = yup.Asserts<typeof packageJsonSchema>;

/**
 * @description being a task to load the package.json starting from the current working directory
 * using a shallow find for the package.json  and `fs` to read the file. If no package.json is found,
 * the process will throw with an appropriate error message.
 */
const loadPkg = async ({ cwd, logger }: { cwd: string; logger: Logger }): Promise<PackageJson> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    throw new Error('Could not find a package.json in the current directory');
  }

  const buffer = await fse.readFile(pkgPath);

  const pkg = JSON.parse(buffer.toString());

  logger.debug('Loaded package.json:', os.EOL, pkg);

  return pkg;
};

/**
 * @description validate the package.json against a standardised schema using `yup`.
 * If the validation fails, the process will throw with an appropriate error message.
 */
const validatePkg = async ({ pkg }: { pkg: object }): Promise<PackageJson> => {
  try {
    return await packageJsonSchema.validate(pkg, {
      strict: true,
    });
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

export type { PackageJson, Export };
export { loadPkg, validatePkg };
