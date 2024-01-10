import { prop, propEq, identity, merge } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Strapi } from '@strapi/types';

const { ValidationError } = errors;

const LOCALE_SCALAR_TYPENAME = 'I18NLocaleCode';
const LOCALE_ARG_PLUGIN_NAME = 'I18NLocaleArg';

const getLocalizedTypesFromRegistry = ({ strapi, typeRegistry }: any) => {
  const { KINDS } = strapi.plugin('graphql').service('constants');
  const { isLocalizedContentType } = strapi.plugin('i18n').service('content-types');

  return typeRegistry.where(
    ({ config }: any) => config.kind === KINDS.type && isLocalizedContentType(config.contentType)
  );
};

export default ({ strapi }: { strapi: Strapi }) => ({
  register() {
    const { service: getGraphQLService } = strapi.plugin('graphql');
    const { service: getI18NService } = strapi.plugin('i18n');

    const { isLocalizedContentType } = getI18NService('content-types');

    const extensionService = getGraphQLService('extension');

    const getCreateLocalizationMutationType = (contentType: any) => {
      const { getTypeName } = getGraphQLService('utils').naming;

      return `create${getTypeName(contentType)}Localization`;
    };

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
      const {
        mutations: createLocalizationMutations,
        resolversConfig: createLocalizationResolversConfig,
      } = getCreateLocalizationMutations({ nexus, typeRegistry });

      return {
        plugins: [i18nLocaleArgPlugin],
        types: [i18nLocaleScalar, createLocalizationMutations],

        resolversConfig: {
          // Auth for createLocalization mutations
          ...createLocalizationResolversConfig,
          // locale arg transformation for localized createEntity mutations
          ...getLocalizedCreateMutationsResolversConfigs({ typeRegistry }),

          // Modify the default scope associated to find and findOne locale queries to match the actual action name
          'Query.i18NLocale': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
          'Query.i18NLocales': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
        },
      };
    });

    const getLocaleScalar = ({ nexus }: any) => {
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

          const isValidLocale = ast.value === 'all' || locales.find(propEq('code', ast.value));

          if (!isValidLocale) {
            throw new ValidationError('Unknown locale supplied');
          }

          return ast.value;
        },
      });
    };

    const getCreateLocalizationMutations = ({ nexus, typeRegistry }: any) => {
      const localizedContentTypes = getLocalizedTypesFromRegistry({ strapi, typeRegistry }).map(
        prop('config.contentType')
      );

      const createLocalizationComponents = localizedContentTypes.map((ct: any) =>
        getCreateLocalizationComponents(ct, { nexus })
      );

      // Extract & merge each resolverConfig into a single object
      const resolversConfig = createLocalizationComponents
        .map(prop('resolverConfig'))
        .reduce(merge, {});

      const mutations = createLocalizationComponents.map(prop('mutation'));

      return { mutations, resolversConfig };
    };

    const getCreateLocalizationComponents = (contentType: any, { nexus }: any) => {
      const { getEntityResponseName, getContentTypeInputName } = getGraphQLService('utils').naming;
      const { createCreateLocalizationHandler } = getI18NService('core-api');

      const responseType = getEntityResponseName(contentType);
      const mutationName = getCreateLocalizationMutationType(contentType);

      const resolverHandler = createCreateLocalizationHandler(contentType);

      const mutation = nexus.extendType({
        type: 'Mutation',

        definition(t: any) {
          t.field(mutationName, {
            type: responseType,

            // The locale arg will be automatically added through the i18n graphql extension
            args: {
              id: 'ID',
              data: getContentTypeInputName(contentType),
            },

            async resolve(parent: any, args: any) {
              const { id, locale, data } = args;

              const ctx = {
                id,
                data: { ...data, locale },
              };

              const value = await resolverHandler(ctx);

              return { value, info: { args, resourceUID: contentType.uid } };
            },
          });
        },
      });

      const resolverConfig = {
        [`Mutation.${mutationName}`]: {
          auth: {
            scope: [`${contentType.uid}.createLocalization`],
          },
        },
      };

      return { mutation, resolverConfig };
    };

    const getLocalizedCreateMutationsResolversConfigs = ({ typeRegistry }: any) => {
      const localizedCreateMutationsNames = getLocalizedTypesFromRegistry({
        strapi,
        typeRegistry,
      })
        .map(prop('config.contentType'))
        .map(getGraphQLService('utils').naming.getCreateMutationTypeName);

      return localizedCreateMutationsNames.reduce(
        (acc: any, mutationName: any) => ({
          ...acc,

          [`Mutation.${mutationName}`]: {
            middlewares: [
              // Set data's locale using args' locale
              (resolve: any, parent: any, args: any, context: any, info: any) => {
                args.data.locale = args.locale;

                return resolve(parent, args, context, info);
              },
            ],
          },
        }),
        {}
      );
    };

    const getI18nLocaleArgPlugin = ({ nexus, typeRegistry }: any) => {
      const { isLocalizedContentType } = getI18NService('content-types');

      const addLocaleArg = (config: any) => {
        const { parentType } = config;

        // Only target queries or mutations
        if (parentType !== 'Query' && parentType !== 'Mutation') {
          return;
        }

        const registryType = typeRegistry.get(config.type);

        if (!registryType) {
          return;
        }

        const { contentType } = registryType.config;

        // Ignore non-localized content types
        if (!isLocalizedContentType(contentType)) {
          return;
        }

        config.args.locale = nexus.arg({ type: LOCALE_SCALAR_TYPENAME });
      };

      return nexus.plugin({
        name: LOCALE_ARG_PLUGIN_NAME,

        onAddOutputField(config: any) {
          // Add the locale arg to the queries on localized CTs
          addLocaleArg(config);
        },
      });
    };
  },
});
