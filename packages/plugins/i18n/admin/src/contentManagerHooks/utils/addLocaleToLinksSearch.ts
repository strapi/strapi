import get from 'lodash/get';
import { parse, stringify } from 'qs';

import { getDefaultLocale } from '../../utils/locales';

const addLocaleToLinksSearch = (
  links: any[],
  kind: string,
  contentTypeSchemas: any[],
  locales: any[],
  permissions: any[]
) => {
  return links.map((link) => {
    const contentTypeUID = link.to.split(`/${kind}/`)[1];

    const contentTypeSchema = contentTypeSchemas.find(
      ({ uid }: { uid: string }) => uid === contentTypeUID
    );

    const hasI18nEnabled = get(contentTypeSchema, 'pluginOptions.i18n.localized', false);

    if (!hasI18nEnabled) {
      return link;
    }

    const contentTypePermissions = permissions[contentTypeUID];
    const requiredPermissionsToViewALink =
      kind === 'collectionType'
        ? ['plugin::content-manager.explorer.read', 'plugin::content-manager.explorer.create']
        : ['plugin::content-manager.explorer.read'];

    const contentTypeNeededPermissions = Object.keys(contentTypePermissions).reduce(
      (acc, current) => {
        if (requiredPermissionsToViewALink.includes(current)) {
          acc[current] = contentTypePermissions[current];

          return acc;
        }

        acc[current] = [];

        return acc;
      },
      {} as any
    );

    const defaultLocale = getDefaultLocale(contentTypeNeededPermissions, locales);

    if (!defaultLocale) {
      return { ...link, isDisplayed: false };
    }

    const linkParams: any = link.search ? parse(link.search) : {};

    const params = linkParams
      ? { ...linkParams, plugins: { ...linkParams.plugins, i18n: { locale: defaultLocale } } }
      : { plugins: { i18n: { locale: defaultLocale } } };

    const search = stringify(params, { encode: false });

    return { ...link, search };
  });
};

export default addLocaleToLinksSearch;
