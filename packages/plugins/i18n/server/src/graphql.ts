import { propEq, identity } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

const { ValidationError } = errors;

const LOCALE_SCALAR_TYPENAME = 'I18NLocaleCode';
const LOCALE_ARG_PLUGIN_NAME = 'I18NLocaleArg';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  register() {
    const { service: getGraphQLService } = strapi.plugin('graphql');
    const { service: getI18NService } = strapi.plugin('i18n');

    const { isLocalizedContentType } = getI18NService('content-types');

    const extensionService = getGraphQLService('extension');

    extensionService.shadowCRUD('plugin::i18n.locale').disableMutations();

    // Disable unwanted fields for localized content types
    Object.entries(strapi.contentTypes).forEach(([uid, ct]) => {
      if (isLocalizedContentType(ct)) {
        // Disable locale field in localized inputs
        extensionService.shadowCRUD(uid).field('locale').disableInput();

        // Disable localizations field in localized inputs
        extensionService.shadowCRUD(uid).field('localizations').disableInput();
      }
    });

    extensionService.use(({ nexus, typeRegistry }: any) => {
      const i18nLocaleArgPlugin = getI18nLocaleArgPlugin({ nexus, typeRegistry });
      const i18nLocaleScalar = getLocaleScalar({ nexus });
      return {
        plugins: [i18nLocaleArgPlugin],
        types: [i18nLocaleScalar],

        resolversConfig: {
          // Modify the default scope associated to find and findOne locale queries to match the actual action name
          'Query.i18NLocale': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
          'Query.i18NLocales': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
        },
      };
    });
  },
});

const getLocaleScalar = ({ nexus }: any) => {
  const { service: getI18NService } = strapi.plugin('i18n');

  const locales = getI18NService('iso-locales').getIsoLocales();

  return nexus.scalarType({
    name: LOCALE_SCALAR_TYPENAME,

    description: 'A string used to identify an i18n locale',

    serialize: identity,
    parseValue: identity,

    parseLiteral(ast: any) {
      if (ast.kind !== 'StringValue') {
        throw new ValidationError('Locale cannot represent non string type');
      }

      const isValidLocale = ast.value === '*' || locales.find(propEq('code', ast.value));

      if (!isValidLocale) {
        throw new ValidationError('Unknown locale supplied');
      }

      return ast.value;
    },
  });
};

const getI18nLocaleArgPlugin = ({ nexus, typeRegistry }: any) => {
  const { service: getI18NService } = strapi.plugin('i18n');

  const { isLocalizedContentType } = getI18NService('content-types');

  return nexus.plugin({
    name: LOCALE_ARG_PLUGIN_NAME,

    onAddOutputField(config: any) {
      // Add the locale arg to the queries on localized CTs

      const { parentType } = config;

      // Only target queries or mutations
      if (parentType !== 'Query' && parentType !== 'Mutation') {
        return;
      }

      let contentType;

      if (config?.extensions?.strapi?.contentType) {
        contentType = config.extensions.strapi.contentType;
      } else {
        const registryType = typeRegistry.get(config.type);

        if (!registryType) {
          return;
        }

        contentType = registryType.config.contentType;
      }

      // Ignore non-localized content types
      if (!isLocalizedContentType(contentType)) {
        return;
      }

      if (!config.args) {
        config.args = {};
      }

      config.args.locale = nexus.arg({
        type: LOCALE_SCALAR_TYPENAME,
        description: 'The locale to use for the query',
      });
    },
  });
};
