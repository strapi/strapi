import REPL from 'repl';
import { createCommand } from 'commander';
import { strapiFactory } from '@strapi/core';

import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';

const action = async () => {
  const appContext = await strapiFactory.compile();
  const app = await strapiFactory(appContext).load();

  app.start().then(() => {
    const repl = REPL.start(app.config.info.name + ' > ' || 'strapi > '); // eslint-disable-line prefer-template

    repl.on('exit', (err: Error) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }

      app.server.destroy();
      process.exit(0);
    });
  });
};

/**
 * `$ strapi console`
 */
const command: StrapiCommand = () => {
  return createCommand('console')
    .description('Open the Strapi framework console')
    .action(runAction('console', action));
};

export { action, command };
