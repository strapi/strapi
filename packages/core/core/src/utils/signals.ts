import type { Core } from '@strapi/types';

export const destroyOnSignal = (strapi: Core.Strapi) => {
  let signalReceived = false;

  // For unknown reasons, we receive signals 2 times.
  // As a temporary fix, we ignore the signals received after the first one.

  const terminateStrapi = async () => {
    if (!signalReceived) {
      signalReceived = true;
      await strapi.destroy();
      process.exit();
    }
  };

  ['SIGTERM', 'SIGINT'].forEach((signal) => {
    process.on(signal, terminateStrapi);
  });
};
