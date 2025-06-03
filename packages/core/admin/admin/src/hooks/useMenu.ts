import * as React from 'react';

import { Cog, ShoppingCart, House } from '@strapi/icons';
import cloneDeep from 'lodash/cloneDeep';

import { useTypedSelector } from '../core/store/hooks';
import { useAuth, AuthContextValue } from '../features/Auth';
import { StrapiAppContextValue, useStrapiApp } from '../features/StrapiApp';

/* -------------------------------------------------------------------------------------------------
 * useMenu
 * -----------------------------------------------------------------------------------------------*/

export type MenuItem = Omit<StrapiAppContextValue['menu'][number], 'Component'>;

export interface Menu {
  generalSectionLinks: MenuItem[];
  pluginsSectionLinks: MenuItem[];
  isLoading: boolean;
}

const useMenu = (shouldUpdateStrapi: boolean) => {
  const checkUserHasPermissions = useAuth('useMenu', (state) => state.checkUserHasPermissions);
  const menu = useStrapiApp('useMenu', (state) => state.menu);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);
  const [menuWithUserPermissions, setMenuWithUserPermissions] = React.useState<Menu>({
    generalSectionLinks: [
      {
        icon: House,
        intlLabel: {
          id: 'global.home',
          defaultMessage: 'Home',
        },
        to: '/',
        permissions: [],
        position: 0,
      },
      {
        icon: ShoppingCart,
        intlLabel: {
          id: 'global.marketplace',
          defaultMessage: 'Marketplace',
        },
        to: '/marketplace',
        permissions: permissions.marketplace?.main ?? [],
        position: 7,
      },
      {
        icon: Cog,
        intlLabel: {
          id: 'global.settings',
          defaultMessage: 'Settings',
        },
        to: '/settings',
        // Permissions of this link are retrieved in the init phase
        // using the settings menu
        permissions: [],
        notificationsCount: 0,
        position: 9,
      },
    ],
    pluginsSectionLinks: [],
    isLoading: true,
  });
  const generalSectionLinksRef = React.useRef(menuWithUserPermissions.generalSectionLinks);

  React.useEffect(() => {
    async function applyMenuPermissions() {
      const authorizedPluginSectionLinks = await getPluginSectionLinks(
        menu,
        checkUserHasPermissions
      );

      const authorizedGeneralSectionLinks = await getGeneralLinks(
        generalSectionLinksRef.current,
        shouldUpdateStrapi,
        checkUserHasPermissions
      );

      setMenuWithUserPermissions((state) => ({
        ...state,
        generalSectionLinks: authorizedGeneralSectionLinks,
        pluginsSectionLinks: authorizedPluginSectionLinks,
        isLoading: false,
      }));
    }

    applyMenuPermissions();
  }, [
    setMenuWithUserPermissions,
    generalSectionLinksRef,
    menu,
    permissions,
    shouldUpdateStrapi,
    checkUserHasPermissions,
  ]);

  return menuWithUserPermissions;
};

/* -------------------------------------------------------------------------------------------------
 * Utils
 * -----------------------------------------------------------------------------------------------*/

const getGeneralLinks = async (
  generalSectionRawLinks: MenuItem[],
  shouldUpdateStrapi: boolean = false,
  checkUserHasPermissions: AuthContextValue['checkUserHasPermissions']
) => {
  const generalSectionLinksPermissions = await Promise.all(
    generalSectionRawLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedGeneralSectionLinks = generalSectionRawLinks.filter(
    (_, index) => generalSectionLinksPermissions[index].length > 0
  );

  const settingsLinkIndex = authorizedGeneralSectionLinks.findIndex(
    (obj) => obj.to === '/settings'
  );

  if (settingsLinkIndex === -1) {
    return [];
  }

  const authorizedGeneralLinksClone = cloneDeep(authorizedGeneralSectionLinks);

  authorizedGeneralLinksClone[settingsLinkIndex].notificationsCount = shouldUpdateStrapi ? 1 : 0;

  return authorizedGeneralLinksClone;
};

const getPluginSectionLinks = async (
  pluginsSectionRawLinks: MenuItem[],
  checkUserHasPermissions: AuthContextValue['checkUserHasPermissions']
) => {
  const pluginSectionLinksPermissions = await Promise.all(
    pluginsSectionRawLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index].length > 0
  );

  return authorizedPluginSectionLinks;
};

export { useMenu };
