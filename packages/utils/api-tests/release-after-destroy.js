'use strict';

/**
 * API tests keep the Strapi instance after `destroy()`. Clear the service
 * maps once shutdown has succeeded so the Jest process can collect them.
 * A failed destroy stays intact, so the caller can retry from the failed step.
 *
 * @param {import('@strapi/types').Core.Strapi} instance
 */
const releaseAfterSuccessfulDestroy = (instance) => {
  const originalDestroy = instance.destroy.bind(instance);
  let destroying = false;

  instance.destroy = function destroyAndRelease(...args) {
    if (destroying) {
      return originalDestroy.apply(this, args);
    }

    destroying = true;
    return Promise.resolve(originalDestroy.apply(this, args)).then(
      (value) => {
        destroying = false;
        instance.release();
        return value;
      },
      (error) => {
        destroying = false;
        throw error;
      }
    );
  };

  return instance;
};

module.exports = { releaseAfterSuccessfulDestroy };
