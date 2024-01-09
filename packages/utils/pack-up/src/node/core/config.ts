import { register } from 'esbuild-register/dist/node';
import * as fs from 'fs';
import os from 'os';
import * as path from 'path';
import pkgUp from 'pkg-up';

import { Logger } from './logger';

import type { Export } from './exports';
import type { Runtime } from '../createBuildContext';
import type { PluginOption } from 'vite';

interface LoadConfigOptions {
  cwd: string;
  logger: Logger;
}

const CONFIG_FILE_NAMES = [
  'packup.config.ts',
  'packup.config.js',
  'packup.config.cjs',
  'packup.config.mjs',
];

const loadConfig = async ({ cwd, logger }: LoadConfigOptions): Promise<Config | undefined> => {
  const pkgPath = await pkgUp({ cwd });

  if (!pkgPath) {
    logger.debug(
      'Could not find a package.json in the current directory, therefore no config was loaded'
    );

    return undefined;
  }

  const root = path.dirname(pkgPath);

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.resolve(root, fileName);

    const exists = fs.existsSync(configPath);

    if (exists) {
      const esbuildOptions = { extensions: ['.js', '.mjs', '.ts'] };

      const { unregister } = register(esbuildOptions);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(configPath);

      unregister();

      /**
       * handles esm or cjs exporting.
       */
      const config = mod?.default || mod || undefined;

      if (config) {
        logger.debug('Loaded configuration:', os.EOL, config);
      }

      return config;
    }
  }

  return undefined;
};

interface ConfigBundle {
  source: string;
  import?: string;
  require?: string;
  runtime?: Runtime;
  tsconfig?: string;
  types?: string;
}

interface ConfigOptions {
  bundles?: ConfigBundle[];
  /**
   * @description the directory to output the bundle to.
   */
  dist?: string;
  /**
   * @description Overwrite the default exports.
   */
  exports?: ConfigProperty<Record<string, Export>>;
  /**
   * @description a list of external dependencies to exclude from the bundle.
   * We already collect the dependencies & peerDeps from the package.json.
   */
  externals?: string[];
  minify?: boolean;
  plugins?: PluginOption[] | (({ runtime }: { runtime: Runtime }) => PluginOption[]);
  /**
   * @alpha
   *
   * @description Instead of creating as few chunks as possible, this mode
   * will create separate chunks for all modules using the original module
   * names as file names
   */
  preserveModules?: boolean;
  sourcemap?: boolean;
  runtime?: Runtime;
  /**
   * @description path to the tsconfig file to use for the bundle.
   *
   * @default tsconfig.build.json
   */
  tsconfig?: string;
}

/**
 * @public
 *
 * @description a helper function to define your config in a typesafe manner.
 */
const defineConfig = (configOptions: ConfigOptions): ConfigOptions => configOptions;

type Config = ConfigOptions;

type ConfigPropertyResolver<T> = (currentValue: T) => T;

type ConfigProperty<T> = T | ConfigPropertyResolver<T>;

/** @internal */
export function resolveConfigProperty<T>(prop: ConfigProperty<T> | undefined, initialValue: T): T {
  if (!prop) {
    return initialValue;
  }

  if (typeof prop === 'function') {
    return (prop as ConfigPropertyResolver<T>)(initialValue);
  }

  return prop;
}

export { loadConfig, defineConfig, CONFIG_FILE_NAMES };
export type {
  Config,
  ConfigOptions,
  ConfigBundle,
  ConfigPropertyResolver,
  ConfigProperty,
  PluginOption,
  Runtime,
};
