import type { Core } from '@strapi/types';

export const createReloader = (strapi: Core.Strapi) => {
  const state = {
    shouldReload: 0,
    isWatching: true,
  };

async function reload() {
  if (state.shouldReload > 0) {
    state.shouldReload -= 1;
    reload.isReloading = false;
    return;
  }

  if (strapi.config.get('autoReload')) {
    const server = strapi.server?.httpServer;
    if (server) {
      const timeout: number =
        strapi.config.get('server.shutdownTimeout', 30_000);

      strapi.log.info(
        `[reloader] Draining in-flight requests before reload ` +
        `(timeout: ${timeout}ms)...`
      );

      server.closeIdleConnections();

      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          strapi.log.warn(
            '[reloader] Drain timeout reached, proceeding with reload'
          );
          resolve();
        }, timeout);

        server.close(() => {
          clearTimeout(t);
          resolve();
        });
      });
    }

    process.send?.('reload');
  }
}

  

  Object.defineProperty(reload, 'isWatching', {
    configurable: true,
    enumerable: true,
    set(value) {
      // Special state when the reloader is disabled temporarly (see GraphQL plugin example).
      if (state.isWatching === false && value === true) {
        state.shouldReload += 1;
      }
      state.isWatching = value;
    },
    get() {
      return state.isWatching;
    },
  });

  reload.isReloading = false;
  reload.isWatching = true;

  return reload;
};
