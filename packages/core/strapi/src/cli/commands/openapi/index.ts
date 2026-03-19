import { createCommand } from 'commander';

import type { StrapiCommand } from '../../types';
import { runAction } from '../../utils/helpers';
import { action as generate } from './generate';

/**
 * `$ strapi openapi`
 */
const command: StrapiCommand = () => {
  const openapi = createCommand('openapi').description(
    'Manage OpenAPI specifications for your Strapi application'
  );

  // `$ strapi openapi generate [-o, --output <path>]`
  openapi
    .command('generate')
    .description('Generate an OpenAPI specification for the current Strapi application')
    .option('-o, --output <path>', 'Output file path for the OpenAPI specification')
    .action(runAction('openapi:generate', generate));

  return openapi;
};

export { command };
