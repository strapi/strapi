import { parse, stringify } from 'qs';

import { doesPluginOptionsHaveI18nLocalized } from '../utils/fields';
import { getDefaultLocale } from '../utils/locales';

import type { Locale, RootState } from '../store/reducers';
import type { Permission, StrapiAppSettingLink } from '@strapi/helper-plugin';
import type { Store } from '@strapi/strapi/admin';
import type { Schema } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * addLocaleToLinksHook
 * -----------------------------------------------------------------------------------------------*/
interface AddLocaleToCTLinksArgs {
  // TODO: this should come from the CM.
  ctLinks: Array<StrapiAppSettingLink & { search?: string }>;
  models: Schema.ContentType[];
}

interface AddLocaleToSTLinksArgs {
  // TODO: this should come from the CM.
  stLinks: Array<StrapiAppSettingLink & { search?: string }>;
  models: Schema.ContentType[];
}

type AddLocalToLinksHookArgs<TType extends 'collectionType' | 'singleType'> =
  TType extends 'collectionType' ? AddLocaleToCTLinksArgs : AddLocaleToSTLinksArgs;

const addLocaleToLinksHook =
  <TType extends 'collectionType' | 'singleType'>(type: TType) =>
  (args: AddLocalToLinksHookArgs<TType>, store: Store) => {
    const links =
      type === 'collectionType'
        ? (args as AddLocaleToCTLinksArgs).ctLinks
        : (args as AddLocaleToSTLinksArgs).stLinks;

    if (links.length === 0) {
      return args;
    }

    // We inject a reducer, so the store at this point _will_ have the i18n state.
    const storeState = store.getState() as RootState;
    const { locales } = storeState.i18n_locales;
    const { collectionTypesRelatedPermissions } = storeState.rbacProvider;

    const mutatedLinks = addLocaleToLinksSearch(
      links,
      type,
      args.models,
      locales,
      collectionTypesRelatedPermissions
    );

    if (type === 'collectionType') {
      return { ctLinks: mutatedLinks, models: args.models };
    } else {
      return { stLinks: mutatedLinks, models: args.models };
    }
  };

/* -------------------------------------------------------------------------------------------------
 * addLocaleToLinksHook
 * -----------------------------------------------------------------------------------------------*/
const addLocaleToLinksSearch = (
  links: Array<StrapiAppSettingLink & { search?: string }>,
  kind: 'collectionType' | 'singleType',
  contentTypeSchemas: Schema.ContentType[],
  locales: Locale[],
  permissions: Record<string, Record<string, Permission[]>>
) => {
  return links.map((link) => {
    const contentTypeUID = link.to.split(`/${kind}/`)[1];

    const contentTypeSchema = contentTypeSchemas.find(({ uid }) => uid === contentTypeUID);

    const hasI18nEnabled = doesPluginOptionsHaveI18nLocalized(contentTypeSchema?.pluginOptions)
      ? contentTypeSchema?.pluginOptions.i18n.localized
      : false;

    if (!hasI18nEnabled) {
      return link;
    }

    const contentTypePermissions = permissions[contentTypeUID];
    const requiredPermissionsToViewALink =
      kind === 'collectionType'
        ? ['plugin::content-manager.explorer.read', 'plugin::content-manager.explorer.create']
        : ['plugin::content-manager.explorer.read'];

    const contentTypeNeededPermissions = Object.keys(contentTypePermissions).reduce<
      Record<string, Permission[]>
    >((acc, current) => {
      if (requiredPermissionsToViewALink.includes(current)) {
        acc[current] = contentTypePermissions[current];

        return acc;
      }

      acc[current] = [];

      return acc;
    }, {});

    const defaultLocale = getDefaultLocale(contentTypeNeededPermissions, locales);

    if (!defaultLocale) {
      return { ...link, isDisplayed: false };
    }

    const linkParams = link.search ? parse(link.search) : {};

    const params = linkParams
      ? {
          ...linkParams,
          plugins: {
            // TODO: can this be made "prettier"?
            ...(typeof linkParams.plugins === 'object' && linkParams.plugins !== null
              ? linkParams.plugins
              : {}),
            i18n: { locale: defaultLocale },
          },
        }
      : { plugins: { i18n: { locale: defaultLocale } } };

    const search = stringify(params, { encode: false });

    return { ...link, search };
  });
};

export { addLocaleToLinksHook };
