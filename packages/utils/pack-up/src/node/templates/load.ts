import { register } from 'esbuild-register/dist/node';
import { existsSync } from 'fs';
import { resolve } from 'path';

import type { TemplateOrTemplateResolver } from './types';
import type { Logger } from '../core/logger';

/**
 * @internal
 *
 * @description Resolve a template from a path and return it.
 */
const loadTemplate = (
  path: string,
  { logger }: { logger: Logger }
): TemplateOrTemplateResolver | undefined => {
  const configPath = resolve(path);

  const exists = existsSync(configPath);

  if (exists) {
    const esbuildOptions = { extensions: ['.js', '.mjs', '.ts'] };

    const { unregister } = register(esbuildOptions);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(configPath);

    unregister();

    if (!mod) {
      logger.warn(`Could not find template at: ${path}. Are you sure it exists?`);
      return undefined;
    }

    logger.debug('Loaded user provided template from: ', path);

    /**
     * handles esm or cjs exporting.
     */
    return mod?.default || mod;
  }

  logger.warn(`Could not find template at: ${path}. Are you sure it exists?`);

  return undefined;
};

export { loadTemplate };
