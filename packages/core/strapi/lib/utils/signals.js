'use strict';

/**
 * @typedef {import('types').Strapi} Strapi
 */

/**
 * @param {Strapi} strapi
 */
const destroyOnSignal = strapi => {
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

  /**
   * @type {NodeJS.Signals[]}
   */
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, terminateStrapi);
  });
};

module.exports = {
  destroyOnSignal,
};
