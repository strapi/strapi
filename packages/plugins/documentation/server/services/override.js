'use strict';

const { getPluginsThatNeedDocumentation } = require('./utils/get-plugins-that-need-documentation');

module.exports = ({ strapi }) => {
  const registeredDocs = [];

  return {
    registeredDocs,
    registerDoc(doc, pluginOrigin) {
      const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(
        strapi.config.get('plugin.documentation')
      );
      console.log('adding override from', pluginOrigin, doc);
      let registeredDoc = doc;

      if (pluginOrigin) {
        if (!pluginsThatNeedDocumentation.includes(pluginOrigin)) {
          return strapi.log.info(
            `@strapi/documentation will not use the override provided by ${pluginOrigin} since the plugin was not specified in the x-strapi-config.plugins array`
          );
        }
      } else {
        strapi.log.warn(
          '@strapi/documentation received an override that did not specify its origin, this could cause unexpected schema generation'
        );
      }

      // parseYaml
      if (typeof doc === 'string') {
        registeredDoc = require('yaml').parse(registeredDoc);
      }
      // receive an object we can register it directly
      registeredDocs.push(registeredDoc);
      console.log('adding override', registeredDocs);
    },
  };
};
