import * as React from 'react';

import { Cog, Puzzle, ShoppingCart } from '@strapi/icons';
import cloneDeep from 'lodash/cloneDeep';
import { useSelector } from 'react-redux';

import { useAuth, type Permission } from '../features/Auth';
import { StrapiAppContextValue, useStrapiApp } from '../features/StrapiApp';
import { selectAdminPermissions } from '../selectors';

/* -------------------------------------------------------------------------------------------------
 * useMenu
 * -----------------------------------------------------------------------------------------------*/

type MenuItem = Omit<StrapiAppContextValue['menu'][number], 'Component'>;

export interface Menu {
  generalSectionLinks: MenuItem[];
  pluginsSectionLinks: MenuItem[];
  isLoading: boolean;
}

const useMenu = (shouldUpdateStrapi: boolean) => {
  const checkUserHasPermissions = useAuth('useMenu', (state) => state.checkUserHasPermissions);
  const menu = useStrapiApp('useMenu', (state) => state.menu);
  const permissions = useSelector(selectAdminPermissions);
  const [menuWithUserPermissions, setMenuWithUserPermissions] = React.useState<Menu>({
    generalSectionLinks: [
      {
        icon: Puzzle,
        intlLabel: {
          id: 'global.plugins',
          defaultMessage: 'Plugins',
        },
        to: '/list-plugins',
        permissions: permissions.marketplace?.main ?? [],
      },
      {
        icon: ShoppingCart,
        intlLabel: {
          id: 'global.marketplace',
          defaultMessage: 'Marketplace',
        },
        to: '/marketplace',
        permissions: permissions.marketplace?.main ?? [],
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
  checkUserHasPermissions: (permissions: Permission[]) => Promise<boolean>
) => {
  const generalSectionLinksPermissions = await Promise.all(
    generalSectionRawLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedGeneralSectionLinks = generalSectionRawLinks.filter(
    (_, index) => generalSectionLinksPermissions[index]
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
  checkUserHasPermissions: (permissions: Permission[]) => Promise<boolean>
) => {
  const pluginSectionLinksPermissions = await Promise.all(
    pluginsSectionRawLinks.map(({ permissions }) => checkUserHasPermissions(permissions))
  );

  const authorizedPluginSectionLinks = pluginsSectionRawLinks.filter(
    (_, index) => pluginSectionLinksPermissions[index]
  );

  return authorizedPluginSectionLinks;
};

export { useMenu };
