import { resolve } from 'path';

import { CommonCLIOptions } from '../types';

import { isError } from './core/errors';
import { ensurePackagePathIsViable } from './core/files';
import { createLogger } from './core/logger';
import { createPackageFromTemplate } from './templates/create';
import { defaultTemplate } from './templates/internal/default';
import { loadTemplate } from './templates/load';
import { TemplateOrTemplateResolver } from './templates/types';

export interface InitOptions extends CommonCLIOptions {
  cwd?: string;
  path: string;
  template?: TemplateOrTemplateResolver | string;
}

export const init = async (opts: InitOptions) => {
  const { silent, debug, cwd = process.cwd(), path } = opts;
  let { template = defaultTemplate } = opts;

  const logger = createLogger({ silent, debug });

  if (!path) {
    logger.error('Path is a required option');
    process.exit(1);
  }

  const packageRoot = resolve(cwd, path);

  logger.debug('Package is: ', packageRoot);

  if (typeof template === 'string') {
    const templatePath = resolve(cwd, template);
    const userTemplate = loadTemplate(templatePath, { logger });

    if (userTemplate) {
      template = userTemplate;
    } else {
      /**
       * the loadTemplate function would have already warned the user
       * we can't find their template, we just now ensure we don't
       * pass the string.
       */
      template = defaultTemplate;
    }
  }

  await ensurePackagePathIsViable(packageRoot).catch((err) => {
    if (isError(err)) {
      logger.error(err.message);
    }

    process.exit(1);
  });

  logger.debug('Package path is viable');

  await createPackageFromTemplate(packageRoot, {
    logger,
    cwd,
    template,
  });
};
