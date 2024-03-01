import type { Core } from '@strapi/types';

import type { CLIContext } from '../cli/types';
import { BuildOptions } from './build';

interface BaseContext {
  /**
   * The absolute path to the app directory defined by the Strapi instance
   */
  appDir: string;
  /**
   * If a user is deploying the project under a nested public path, we use
   * this path so all asset paths will be rewritten accordingly
   */
  basePath: string;
  /**
   * The bundler to use for building & watching
   */
  bundler: Pick<Required<BuildOptions>, 'bundler'>['bundler'];
  /**
   * The current working directory
   */
  cwd: string;
  /**
   * The absolute path to the dist directory
   */
  distPath: string;
  /**
   * The relative path to the dist directory
   */
  distDir: string;
  /**
   * The absolute path to the entry file
   */
  entry: string;
  /**
   * The environment variables to be included in the JS bundle
   */
  env: Record<string, string>;
  logger: CLIContext['logger'];

  /**
   * The absolute path to the runtime directory
   */
  runtimeDir: string;
  /**
   * The Strapi instance
   */
  strapi: Core.Strapi;
  /**
   * The browserslist target either loaded from the user's workspace or falling back to the default
   */
  target: string[];
  tsconfig?: CLIContext['tsconfig'];
}

export type { BaseContext };
