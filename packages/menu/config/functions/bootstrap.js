'use strict';
/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 */

const pluginPkg = require('../../package.json');
module.exports = async () => {
  // const pluginStore = strapi.store({
  //   environment: '',
  //   type: 'plugin',
  //   name: 'menu',
  // });

  const selectedDefaultContentType = 'Page';
  const plugin = pluginPkg.name;

  //Check if content type Page exists
  const page_contentType = Object.entries(strapi.contentTypes).find(
    item => item[1].globalId === selectedDefaultContentType
  );

  if (page_contentType && page_contentType[1]) {
    strapi.log.info(
      `Successfuly found collection '${selectedDefaultContentType}', plugin '${plugin}' is running`
    );
  } else {
    strapi.log.error(`collection '${selectedDefaultContentType}' is missing`);
    strapi.log.warn(`plugin '${plugin}' is disabled`);
  }
};
