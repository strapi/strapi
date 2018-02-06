'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

module.exports = async cb => {
  const pluginStore = strapi.store({
    environment: '',
    type: 'core'
  });

  if (!await pluginStore.get({key: 'application'})) {
    const value = {
      name: 'Default Application',
      description: 'This API is going to be awesome!'
    };

    await pluginStore.set({key: 'application', value});
  }

  cb();
};
