'use strict';

const { propEq, identity } = require('lodash/fp');

const LOCALE_SCALAR_TYPENAME = 'Locale';
const LOCALE_ARG_PLUGIN_NAME = 'I18NLocaleArg';

module.exports = ({ strapi }) => ({
  register() {
    strapi
      .plugin('graphql')
      .service('extension')
      .for('content-api')
      .use(({ nexus, typeRegistry }) => {
        const i18nLocaleArgPlugin = createI18nLocaleArgPlugin({ nexus, strapi, typeRegistry });
        const i18nLocaleScalar = createLocaleScalar({ nexus, strapi });

        return {
          plugins: [i18nLocaleArgPlugin],
          types: [i18nLocaleScalar],
        };
      });
  },
});

const createLocaleScalar = ({ nexus, strapi }) => {
  const locales = strapi
    .plugin('i18n')
    .service('iso-locales')
    .getIsoLocales();

  return nexus.scalarType({
    name: LOCALE_SCALAR_TYPENAME,

    description: 'A string used to identify an i18n locale',

    serialize: identity,
    parseValue: identity,

    parseLiteral(ast) {
      if (ast.kind !== 'StringValue') {
        throw new TypeError('Locale cannot represent non string type');
      }

      const isValidLocale = locales.find(propEq('code', ast.value));

      if (!isValidLocale) {
        throw new TypeError('Unknown locale supplied');
      }

      return ast.value;
    },
  });
};

const createI18nLocaleArgPlugin = ({ nexus, strapi, typeRegistry }) => {
  const { isLocalizedContentType } = strapi.plugin('i18n').service('content-types');

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

    config.args.locale = nexus.arg({ type: LOCALE_SCALAR_TYPENAME });
  };

  return nexus.plugin({
    name: LOCALE_ARG_PLUGIN_NAME,

    onAddOutputField(config) {
      // Add the locale arg to the queries on localized CTs
      addLocaleArg(config);
    },
  });
};
