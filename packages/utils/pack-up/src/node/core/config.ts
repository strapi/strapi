import { register } from 'esbuild-register/dist/node';
import * as fs from 'fs';
import * as path from 'path';
import pkgUp from 'pkg-up';

import { Runtime } from '../createBuildContext';

import { Logger } from './logger';

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
      return mod?.default || mod || undefined;
    }
  }

  return undefined;
};

interface ConfigBundle {
  source: string;
  import?: string;
  require?: string;
  runtime?: Runtime;
}

interface ConfigOptions {
  bundles?: ConfigBundle[];
  /**
   * @description the directory to output the bundle to.
   */
  dist?: string;
  /**
   * @description a list of external dependencies to exclude from the bundle.
   * We already collect the dependencies & peerDeps from the package.json.
   */
  externals?: string[];
  minify?: boolean;
  sourcemap?: boolean;
  runtime?: Runtime;
}

/**
 * @public
 *
 * @description a helper function to define your config in a typesafe manner.
 */
const defineConfig = (configOptions: ConfigOptions): ConfigOptions => configOptions;

type Config = ConfigOptions;

export { loadConfig, defineConfig };
export type { Config };
