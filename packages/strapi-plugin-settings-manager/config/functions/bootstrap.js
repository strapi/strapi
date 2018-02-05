'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

module.exports = async cb => {
  if (!await strapi.config.get('application', '', 'core')) {
    const application = {
      name: 'Default Application',
      description: 'This API is going to be awesome!'
    };

    await strapi.config.set('application', application, '', 'core');
  }

  cb();
};
