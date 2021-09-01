'use strict';

module.exports = ({ strapi }) => ({
  register() {
    const useExtension = strapi
      .plugin('graphql')
      .service('extension')
      .for('content-api').use;

    const { isLocalizedContentType } = strapi.plugin('i18n').service('content-types');

    useExtension(({ nexus, typeRegistry }) => {
      /**
       * Adds a "locale" arg to localized queries and mutations
       * @param {object} config
       */
      const addLocaleArg = config => {
        const { parentType } = config;

        // Only target queries or mutations
        if (parentType !== 'Query' && parentType !== 'Mutation') {
          return;
        }

        const contentType = typeRegistry.get(config.type).config.contentType;

        // Ignore non-localized content types
        if (!isLocalizedContentType(contentType)) {
          return;
        }

        config.args.locale = nexus.stringArg();
      };

      const i18nPlugin = nexus.plugin({
        name: 'i18nPlugin',

        onAddOutputField(config) {
          // Add the locale arg to the queries on localized CTs
          addLocaleArg(config);
        },
      });

      return { plugins: [i18nPlugin] };
    });
  },
});
