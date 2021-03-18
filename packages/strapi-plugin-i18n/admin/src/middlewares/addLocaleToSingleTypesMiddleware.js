import get from 'lodash/get';
import { stringify, parse } from 'qs';
import getDefaultLocale from '../utils/getDefaultLocale';

const addLocaleToSingleTypesMiddleware = () => ({ getState }) => next => action => {
  if (action.type !== 'StrapiAdmin/LeftMenu/SET_CT_OR_ST_LINKS') {
    return next(action);
  }

  if (action.data.authorizedStLinks.length) {
    const store = getState();
    const { locales } = store.get('i18n_locales');
    const { collectionTypesRelatedPermissions } = store.get('permissionsManager');

    action.data.authorizedStLinks = action.data.authorizedStLinks.map(link => {
      const singleTypeUID = link.destination.split('/singleType/')[1];
      const singleTypeSchema = action.data.contentTypeSchemas.find(
        ({ uid }) => uid === singleTypeUID
      );

      const hasI18nEnabled = get(singleTypeSchema, 'pluginOptions.i18n.localized', false);

      if (!hasI18nEnabled) {
        return link;
      }

      const singleTypePermissions = collectionTypesRelatedPermissions[singleTypeUID];
      const singleTypeNeededPermissions = Object.keys(singleTypePermissions).reduce(
        (acc, current) => {
          if (current === 'plugins::content-manager.explorer.read') {
            acc[current] = singleTypePermissions[current];

            return acc;
          }

          acc[current] = [];

          return acc;
        },
        {}
      );
      const defaultLocale = getDefaultLocale(singleTypeNeededPermissions, locales);

      if (!defaultLocale) {
        return { ...link, isDisplayed: false };
      }

      const linkParams = link.search ? parse(link.search) : {};

      const params = linkParams
        ? { ...linkParams, plugins: { ...linkParams.plugins, i18n: { locale: defaultLocale } } }
        : { plugins: { i18n: { locale: defaultLocale } } };

      const search = stringify(params, { encode: false });

      return { ...link, search };
    });
  }

  return next(action);
};

export default addLocaleToSingleTypesMiddleware;
