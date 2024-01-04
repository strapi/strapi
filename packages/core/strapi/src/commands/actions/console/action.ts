import REPL from 'repl';
import { strapiFactory } from '@strapi/core';

/**
 * `$ strapi console`
 */
export default async () => {
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
