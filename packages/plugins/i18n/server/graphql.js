'use strict';

const { prop, propEq, identity } = require('lodash/fp');

const LOCALE_SCALAR_TYPENAME = 'I18NLocaleCode';
const LOCALE_ARG_PLUGIN_NAME = 'I18NLocaleArg';

module.exports = ({ strapi }) => ({
  register() {
    const { service: getGraphQLService } = strapi.plugin('graphql');
    const { service: getI18NService } = strapi.plugin('i18n');

    const extensionService = getGraphQLService('extension');

    const getCreateLocalizationMutationType = contentType => {
      const { getTypeName } = getGraphQLService('utils').naming;

      return `create${getTypeName(contentType)}Localization`;
    };

    extensionService.shadowCRUD('plugin::i18n.locale').disableMutations();

    extensionService.use(({ nexus, typeRegistry }) => {
      const i18nLocaleArgPlugin = getI18nLocaleArgPlugin({ nexus, typeRegistry });
      const i18nLocaleScalar = getLocaleScalar({ nexus });
      const createLocalizationMutations = getCreateLocalizationMutations({
        nexus,
        typeRegistry,
      });

      return {
        plugins: [i18nLocaleArgPlugin],
        types: [i18nLocaleScalar, createLocalizationMutations],
      };
    });

    const getLocaleScalar = ({ nexus }) => {
      const locales = getI18NService('iso-locales').getIsoLocales();

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

    const getCreateLocalizationMutations = ({ nexus, typeRegistry }) => {
      const { KINDS } = getGraphQLService('constants');
      const { isLocalizedContentType } = getI18NService('content-types');

      const localizedContentTypes = typeRegistry
        .where(
          ({ config }) => config.kind === KINDS.type && isLocalizedContentType(config.contentType)
        )
        .map(prop('config.contentType'));

      return localizedContentTypes.map(ct => getCreateLocalizationMutation(ct, { nexus }));
    };

    const getCreateLocalizationMutation = (contentType, { nexus }) => {
      const { getEntityResponseName, getContentTypeInputName } = getGraphQLService('utils').naming;
      const { createCreateLocalizationHandler } = getI18NService('core-api');

      const responseType = getEntityResponseName(contentType);
      const mutationName = getCreateLocalizationMutationType(contentType);

      const resolverHandler = createCreateLocalizationHandler(contentType);

      return nexus.extendType({
        type: 'Mutation',

        definition(t) {
          t.field(mutationName, {
            type: responseType,

            // The locale arg will be automatically added through the i18n graphql extension
            args: {
              id: 'ID',
              data: getContentTypeInputName(contentType),
            },

            async resolve(parent, args) {
              const value = await resolverHandler(args);

              return { value, info: { args, resourceUID: contentType.uid } };
            },
          });
        },
      });
    };

    const getI18nLocaleArgPlugin = ({ nexus, typeRegistry }) => {
      const { isLocalizedContentType } = getI18NService('content-types');

      const addLocaleArg = config => {
        const { parentType } = config;

        // Only target queries or mutations
        if (parentType !== 'Query' && parentType !== 'Mutation') {
          return;
        }

        const registryType = typeRegistry.get(config.type);

        if (!registryType) {
          return;
        }

        const contentType = registryType.config.contentType;

        const createLocalizationMutationType = getCreateLocalizationMutationType(contentType);

        // Ignore non-localized content types
        if (
          !isLocalizedContentType(contentType) ||
          // Don't add the "locale" arg on "create localization" mutations
          config.name === createLocalizationMutationType
        ) {
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
  },
});
